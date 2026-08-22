import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '@/config/prisma.js';
import type {
   CreateRegistrationRequest,
   RegistrationPagination,
   ReplaceResponsesRequest,
   InternalRegistrationListQuery,
   BulkRegistrationDecisionRequest,
} from './eventRegistrationTypes.js';
import {
   activeRegistrationStatuses,
   capacityConsumingStatuses,
   ResponseAccessDenied,
   ResponseCorrectionDeadlinePassed,
   ResponseRevisionConflict,
   ResponseValidationFailure,
   validateFreshSubmission,
} from './eventRegistrationTypes.js';
import { assignPublishedPostRegistrationForms } from '@/features/post-registration-forms/postRegistrationFormRepository.js';
import { issueTicketsForApprovedOrder } from '@/features/event-tickets/eventTicketService.js';

export const correctionResubmissionStatus = (
   paymentStatus: string | null,
   approvalMode: string,
) => {
   if (paymentStatus === 'UNPAID' || paymentStatus === 'REJECTED')
      return 'PENDING_PAYMENT' as const;
   if (paymentStatus === 'PROOF_SUBMITTED') return 'PAYMENT_REVIEW' as const;
   if (paymentStatus === 'VERIFIED')
      return approvalMode === 'AUTO_APPROVE'
         ? ('APPROVED' as const)
         : ('PENDING_APPROVAL' as const);
   return null;
};

const createInvitationToken = () => {
   const token = randomBytes(32).toString('base64url');
   return {
      token,
      tokenHash: createHash('sha256').update(token).digest('hex'),
   };
};

const publicSubEventSelect = {
   id: true,
   name: true,
   publicDescription: true,
   date: true,
   type: true,
   locationName: true,
   locationUrl: true,
   posterUrl: true,
   visibility: true,
   status: true,
   registrationMode: true,
   isRegistrationOpen: true,
} satisfies Prisma.SubeventSelect;

const packageSelect = {
   id: true,
   code: true,
   name: true,
   seatCount: true,
   currency: true,
   priceMinor: true,
   revision: true,
   status: true,
   salesStartAt: true,
   salesEndAt: true,
} satisfies Prisma.TicketPackageSelect;

const currentRegistrationFormInclude = {
   sections: { orderBy: { orderIndex: 'asc' as const } },
   questions: {
      where: { status: 'ACTIVE' as const },
      orderBy: { orderIndex: 'asc' as const },
      include: {
         options: {
            where: { isActive: true },
            orderBy: { orderIndex: 'asc' as const },
         },
      },
   },
} satisfies Prisma.RegistrationFormInclude;

const detailInclude = {
   event: { select: { id: true, name: true } },
   subEvent: { select: { id: true, name: true, date: true } },
   ticketPackage: { select: packageSelect },
   members: {
      select: {
         id: true,
         userId: true,
         isBuyer: true,
         status: true,
         position: true,
         user: { select: { name: true, email: true } },
      },
   },
   invitations: {
      orderBy: { slotPosition: 'asc' as const },
      select: {
         id: true,
         email: true,
         status: true,
         slotPosition: true,
         expiresAt: true,
      },
   },
   submissions: {
      orderBy: { createdAt: 'asc' as const },
      include: {
         form: {
            include: {
               sections: { orderBy: { orderIndex: 'asc' as const } },
               questions: {
                  where: { status: 'ACTIVE' as const },
                  orderBy: { orderIndex: 'asc' as const },
                  include: { options: { where: { isActive: true } } },
               },
            },
         },
         answers: {
            include: { selectedOptions: true, question: true },
         },
      },
   },
   history: {
      where: { entityType: 'ORDER', toStatus: 'NEEDS_CORRECTION' },
      orderBy: [{ createdAt: 'desc' as const }, { id: 'desc' as const }],
      take: 1,
      select: { reason: true },
   },
} satisfies Prisma.RegistrationOrderInclude;

const internalDetailInclude = {
   ...detailInclude,
   buyer: { select: { id: true, name: true, email: true, nim: true } },
   payment: { select: { status: true } },
   history: {
      orderBy: [{ createdAt: 'asc' as const }, { id: 'asc' as const }],
      select: {
         id: true,
         entityType: true,
         fromStatus: true,
         toStatus: true,
         reason: true,
         createdAt: true,
         actor: { select: { id: true, name: true } },
      },
   },
} satisfies Prisma.RegistrationOrderInclude;

export const buildInternalRegistrationWhere = (
   subEventId: string,
   params: Omit<InternalRegistrationListQuery, 'page' | 'limit' | 'sort'>,
): Prisma.RegistrationOrderWhereInput => ({
   subEventId,
   ...(params.status && { status: params.status }),
   ...(params.responseStatus && {
      AND: [
         { submissions: { some: { status: params.responseStatus } } },
         ...(params.responseStatus === 'NEEDS_CORRECTION'
            ? []
            : [
                 {
                    submissions: {
                       none: {
                          status: {
                             in:
                                params.responseStatus === 'DRAFT'
                                   ? ['NEEDS_CORRECTION']
                                   : params.responseStatus === 'SUBMITTED'
                                     ? ['NEEDS_CORRECTION', 'DRAFT']
                                     : params.responseStatus === 'LOCKED'
                                       ? [
                                            'NEEDS_CORRECTION',
                                            'DRAFT',
                                            'SUBMITTED',
                                         ]
                                       : [
                                            'NEEDS_CORRECTION',
                                            'DRAFT',
                                            'SUBMITTED',
                                            'LOCKED',
                                         ],
                          },
                       },
                    },
                 } as Prisma.RegistrationOrderWhereInput,
              ]),
      ],
   }),
   ...(params.paymentStatus === 'NOT_REQUIRED' && {
      totalMinor: 0,
      payment: null,
   }),
   ...(params.search && {
      OR: [
         { orderNumber: { contains: params.search, mode: 'insensitive' } },
         { buyer: { name: { contains: params.search, mode: 'insensitive' } } },
         { buyer: { email: { contains: params.search, mode: 'insensitive' } } },
         { buyer: { nim: { contains: params.search, mode: 'insensitive' } } },
      ],
   }),
});

class EventRegistrationRepository {
   private async expireAssemblyOrders(
      tx: Prisma.TransactionClient,
      filter: Prisma.RegistrationOrderWhereInput,
   ) {
      const now = new Date();
      const expired = await tx.registrationOrder.findMany({
         where: {
            ...filter,
            status: { in: ['DRAFT', 'AWAITING_MEMBERS', 'HOLDING'] },
            memberDeadlineAt: { lte: now },
         },
         select: { id: true, status: true },
      });
      if (!expired.length) return;
      const ids = expired.map((item) => item.id);
      await tx.registrationCapacityHold.updateMany({
         where: { registrationOrderId: { in: ids }, status: 'ACTIVE' },
         data: { status: 'EXPIRED', releasedAt: now },
      });
      await tx.registrationOrderMember.updateMany({
         where: {
            registrationOrderId: { in: ids },
            status: { not: 'CANCELLED' },
         },
         data: { status: 'CANCELLED' },
      });
      await tx.registrationInvitation.updateMany({
         where: { registrationOrderId: { in: ids }, status: 'PENDING' },
         data: { status: 'EXPIRED' },
      });
      await tx.registrationOrder.updateMany({
         where: { id: { in: ids } },
         data: { status: 'EXPIRED', revision: { increment: 1 } },
      });
      await tx.registrationStatusHistory.createMany({
         data: expired.map((item) => ({
            registrationOrderId: item.id,
            entityType: 'ORDER',
            entityId: item.id,
            fromStatus: item.status,
            toStatus: 'EXPIRED',
            reason: 'Member assembly deadline expired',
         })),
      });
   }

   async expireForRegistration(registrationId: string) {
      return prisma.$transaction((tx) =>
         this.expireAssemblyOrders(tx, { id: registrationId }),
      );
   }

   async expireForSubEvent(subEventId: string) {
      return prisma.$transaction((tx) =>
         this.expireAssemblyOrders(tx, { subEventId }),
      );
   }
   async getSubEventScope(subEventId: string) {
      return prisma.subevent.findUnique({
         where: { id: subEventId },
         select: { id: true, eventId: true },
      });
   }

   async getRegistrationScope(registrationId: string) {
      return prisma.registrationOrder.findUnique({
         where: { id: registrationId },
         select: { id: true, eventId: true, subEventId: true },
      });
   }

   async hasPermission(userId: string, permissionName: string) {
      return (
         (await prisma.user.count({
            where: {
               id: userId,
               status: 'ACTIVE',
               userHasRoles: {
                  some: {
                     role: {
                        status: 'ACTIVE',
                        roleHasPermissions: {
                           some: {
                              permission: {
                                 name: permissionName,
                                 status: 'ACTIVE',
                              },
                           },
                        },
                     },
                  },
               },
            },
         })) > 0
      );
   }

   async listInternal(
      subEventId: string,
      params: InternalRegistrationListQuery,
   ) {
      await this.expireForSubEvent(subEventId);
      const where = buildInternalRegistrationWhere(subEventId, params);
      const [field, direction] = params.sort.split(':') as [
         'submittedAt' | 'createdAt',
         'asc' | 'desc',
      ];
      const orderBy: Prisma.RegistrationOrderOrderByWithRelationInput[] = [
         field === 'submittedAt'
            ? { submittedAt: { sort: direction, nulls: 'last' } }
            : { createdAt: direction },
         { id: direction },
      ];
      const [data, total] = await prisma.$transaction([
         prisma.registrationOrder.findMany({
            where,
            skip: (params.page - 1) * params.limit,
            take: params.limit,
            orderBy,
            select: {
               id: true,
               orderNumber: true,
               revision: true,
               status: true,
               seatCount: true,
               totalMinor: true,
               createdAt: true,
               submittedAt: true,
               buyer: {
                  select: { id: true, name: true, email: true, nim: true },
               },
               subEvent: { select: { id: true, name: true, date: true } },
               payment: { select: { status: true } },
               submissions: {
                  select: {
                     status: true,
                     assignmentRequired: true,
                     form: {
                        select: {
                           questions: {
                              where: { status: 'ACTIVE' },
                              select: {
                                 id: true,
                                 fieldType: true,
                                 isRequired: true,
                                 validation: true,
                                 options: {
                                    where: { isActive: true },
                                    select: { id: true },
                                 },
                              },
                           },
                        },
                     },
                     answers: { include: { selectedOptions: true } },
                  },
               },
               ticketPackage: { select: packageSelect },
               members: { select: { status: true } },
               invitations: { select: { status: true } },
            },
         }),
         prisma.registrationOrder.count({ where }),
      ]);
      return { data, total };
   }

   async capacitySummary(subEventId: string) {
      await this.expireForSubEvent(subEventId);
      return prisma.subevent.findUnique({
         where: { id: subEventId },
         select: {
            id: true,
            name: true,
            maxParticipants: true,
            registrationOrders: {
               where: { status: { in: [...capacityConsumingStatuses] } },
               select: { seatCount: true, status: true },
            },
            capacityHolds: {
               where: {
                  status: 'ACTIVE',
                  expiresAt: { gt: new Date() },
                  order: {
                     status: { notIn: [...capacityConsumingStatuses] },
                  },
               },
               select: { quantity: true },
            },
         },
      });
   }

   async findInternal(registrationId: string) {
      await this.expireForRegistration(registrationId);
      return prisma.registrationOrder.findFirst({
         where: { id: registrationId },
         include: internalDetailInclude,
      });
   }

   async queueNeighbors(
      subEventId: string,
      registrationId: string,
      params: Omit<InternalRegistrationListQuery, 'page' | 'limit'>,
   ) {
      const current = await prisma.registrationOrder.findFirst({
         where: {
            ...buildInternalRegistrationWhere(subEventId, params),
            id: registrationId,
         },
         select: { id: true },
      });
      if (!current) return null;
      const [field, direction] = params.sort.split(':') as [
         'submittedAt' | 'createdAt',
         'asc' | 'desc',
      ];
      const where = buildInternalRegistrationWhere(subEventId, params);
      const orderBy: Prisma.RegistrationOrderOrderByWithRelationInput[] = [
         field === 'submittedAt'
            ? { submittedAt: { sort: direction, nulls: 'last' } }
            : { createdAt: direction },
         { id: direction },
      ];
      const neighbor = (take: 1 | -1) =>
         prisma.registrationOrder
            .findMany({
               where,
               cursor: { id: current.id },
               skip: 1,
               take,
               orderBy,
               select: { id: true, orderNumber: true },
            })
            .then((rows) => rows[0] ?? null);
      const [previous, next] = await Promise.all([neighbor(-1), neighbor(1)]);
      return { previous, next };
   }

   async reviewMany(
      scope: { eventId: string; subEventId: string },
      actorUserId: string,
      action: 'APPROVED' | 'REJECTED' | 'NEEDS_CORRECTION' | 'CANCELLED',
      payload: BulkRegistrationDecisionRequest,
   ) {
      return prisma.$transaction(
         async (tx) => {
            await tx.$queryRaw`SELECT "id" FROM "subevents" WHERE "id" = ${scope.subEventId} FOR UPDATE`;
            const subEvent = await tx.subevent.findUnique({
               where: { id: scope.subEventId },
               select: { correctionDeadlineHours: true },
            });
            if (!subEvent) return { notFound: true } as const;
            const ids = payload.items.map((item) => item.registrationId);
            const orders = await tx.registrationOrder.findMany({
               where: { id: { in: ids }, ...scope },
               select: { id: true, status: true, revision: true },
            });
            if (orders.length !== ids.length)
               return { notFound: true } as const;
            const byId = new Map(orders.map((order) => [order.id, order]));
            const allowed =
               action === 'CANCELLED'
                  ? ['PENDING_APPROVAL', 'APPROVED', 'NEEDS_CORRECTION']
                  : ['PENDING_APPROVAL'];
            if (
               payload.items.some(
                  (item) =>
                     byId.get(item.registrationId)!.revision !== item.revision,
               )
            )
               return { conflict: 'REVISION' } as const;
            if (
               payload.items.some(
                  (item) =>
                     !allowed.includes(byId.get(item.registrationId)!.status),
               )
            )
               return { conflict: 'LIFECYCLE' } as const;
            const now = new Date();
            // Existing rows default to 24 hours; retain that safe fallback for
            // databases temporarily drifted to a nullable legacy column.
            const correctionDeadlineHours =
               subEvent.correctionDeadlineHours ?? 24;
            for (const item of payload.items) {
               const order = byId.get(item.registrationId)!;
               const changed = await tx.registrationOrder.updateMany({
                  where: { id: item.registrationId, revision: item.revision },
                  data: {
                     status: action,
                     revision: { increment: 1 },
                     approvedAt: action === 'APPROVED' ? now : undefined,
                     cancelledAt: action === 'CANCELLED' ? now : undefined,
                     cancellationReason:
                        action === 'CANCELLED' ? payload.reason : undefined,
                     correctionDeadlineAt:
                        action === 'NEEDS_CORRECTION'
                           ? new Date(
                                now.getTime() +
                                   correctionDeadlineHours * 60 * 60 * 1000,
                             )
                           : undefined,
                     idempotencyKey:
                        action === 'NEEDS_CORRECTION' ? null : undefined,
                     idempotencyFingerprint:
                        action === 'NEEDS_CORRECTION' ? null : undefined,
                  },
               });
               if (changed.count !== 1) throw new ResponseRevisionConflict();
               if (action === 'NEEDS_CORRECTION') {
                  await tx.registrationFormSubmission.updateMany({
                     where: { registrationOrderId: item.registrationId },
                     data: { status: 'NEEDS_CORRECTION', lockedAt: null },
                  });
               } else if (action !== 'APPROVED') {
                  await tx.registrationInvitation.updateMany({
                     where: {
                        registrationOrderId: item.registrationId,
                        status: 'PENDING',
                     },
                     data: { status: 'REVOKED' },
                  });
                  await tx.registrationCapacityHold.updateMany({
                     where: {
                        registrationOrderId: item.registrationId,
                        status: { in: ['ACTIVE', 'CONSUMED'] },
                     },
                     data: { status: 'RELEASED', releasedAt: now },
                  });
                  await tx.registrationTicket.updateMany({
                     where: {
                        orderMember: {
                           registrationOrderId: item.registrationId,
                        },
                        status: { in: ['PENDING', 'ACTIVE'] },
                     },
                     data: { status: 'REVOKED', revokedAt: now },
                  });
                  await tx.registrationOrderMember.updateMany({
                     where: {
                        registrationOrderId: item.registrationId,
                        status: { not: 'CANCELLED' },
                     },
                     data: { status: 'CANCELLED' },
                  });
               }
               await tx.registrationStatusHistory.create({
                  data: {
                     registrationOrderId: item.registrationId,
                     entityType: 'ORDER',
                     entityId: item.registrationId,
                     fromStatus: order.status,
                     toStatus: action,
                     actorUserId,
                     reason: payload.reason,
                  },
               });
               if (action === 'APPROVED')
                  await assignPublishedPostRegistrationForms(tx, {
                     orderIds: [item.registrationId],
                  });
               if (action === 'APPROVED')
                  await issueTicketsForApprovedOrder(tx, item.registrationId);
            }
            return tx.registrationOrder.findMany({
               where: { id: { in: ids } },
               select: { id: true, status: true, revision: true },
            });
         },
         { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
   }
   async listPublicEvents(params: RegistrationPagination) {
      const where: Prisma.EventWhereInput = { status: 'PUBLISHED' };
      const [data, total] = await prisma.$transaction([
         prisma.event.findMany({
            where,
            skip: (params.page - 1) * params.limit,
            take: params.limit,
            orderBy: { createdAt: 'desc' },
            select: {
               id: true,
               name: true,
               publicDescription: true,
               coverImageUrl: true,
               status: true,
               subevents: {
                  where: {
                     status: { in: ['OPEN', 'CLOSED'] },
                     visibility: 'PUBLIC',
                  },
                  orderBy: [{ position: 'asc' }, { date: 'asc' }],
                  select: publicSubEventSelect,
               },
            },
         }),
         prisma.event.count({ where }),
      ]);
      return { data, total };
   }

   async getPublicEvent(eventId: string) {
      return prisma.event.findFirst({
         where: { id: eventId, status: 'PUBLISHED' },
         select: {
            id: true,
            name: true,
            publicDescription: true,
            coverImageUrl: true,
            status: true,
            subevents: {
               where: {
                  status: { in: ['OPEN', 'CLOSED'] },
                  visibility: 'PUBLIC',
               },
               orderBy: [{ position: 'asc' }, { date: 'asc' }],
               select: publicSubEventSelect,
            },
         },
      });
   }

   async getContextSource(subEventId: string, userId?: string) {
      await this.expireForSubEvent(subEventId);
      return prisma.subevent.findUnique({
         where: { id: subEventId },
         include: {
            event: { select: { id: true, status: true } },
            ticketPackages: {
               select: packageSelect,
               orderBy: { createdAt: 'asc' },
            },
            registrationOrders: userId
               ? {
                    where: { buyerUserId: userId },
                    select: {
                       id: true,
                       status: true,
                       ticketPackageId: true,
                       correctionDeadlineAt: true,
                    },
                    orderBy: { createdAt: 'desc' },
                 }
               : false,
         },
      });
   }

   async getUserEligibility(userId: string) {
      return prisma.user.findUnique({
         where: { id: userId },
         select: {
            id: true,
            email: true,
            emailVerified: true,
            status: true,
            registrationCompletedAt: true,
            accounts: { select: { providerId: true } },
            membershipPeriods: {
               where: { isCurrent: true, period: { isActive: true } },
               select: { periodId: true },
               take: 1,
            },
         },
      });
   }

   async findInvitation(subEventId: string, tokenHash: string, userId: string) {
      return prisma.registrationInvitation.findFirst({
         where: {
            subEventId,
            tokenHash,
            OR: [
               { status: 'PENDING', expiresAt: { gt: new Date() } },
               {
                  status: 'ACCEPTED',
                  claimedBy: userId,
                  expiresAt: { gt: new Date() },
               },
            ],
         },
         select: { id: true, email: true },
      });
   }

   async getAssignedForms(subEventId: string) {
      return prisma.registrationForm.findMany({
         where: {
            subEventId,
            status: 'PUBLISHED',
            stage: 'REGISTRATION',
            deletedAt: null,
         },
         orderBy: { orderIndex: 'asc' },
         include: currentRegistrationFormInclude,
      });
   }

   async createOrResumeDraft(
      subEventId: string,
      userId: string,
      payload: CreateRegistrationRequest,
      inviteTokenHash?: string,
   ) {
      return prisma.$transaction(
         async (tx) => {
            await tx.$queryRaw`SELECT "id" FROM "subevents" WHERE "id" = ${subEventId} FOR UPDATE`;
            await this.expireAssemblyOrders(tx, { subEventId });
            const subEvent = await tx.subevent.findUnique({
               where: { id: subEventId },
               include: { event: { select: { status: true } } },
            });
            if (!subEvent) return null;

            const identity = await tx.user.findUnique({
               where: { id: userId },
               select: {
                  email: true,
                  emailVerified: true,
                  status: true,
                  registrationCompletedAt: true,
                  accounts: { select: { providerId: true } },
                  membershipPeriods: {
                     where: { isCurrent: true, period: { isActive: true } },
                     select: { periodId: true },
                     take: 1,
                  },
               },
            });
            if (!identity || identity.status !== 'ACTIVE')
               return { eligibilityCode: 'ACCOUNT_INACTIVE' } as const;
            if (subEvent.event.status !== 'PUBLISHED')
               return { eligibilityCode: 'REGISTRATION_CLOSED' } as const;
            if (
               subEvent.visibility === 'PUBLIC' &&
               (!identity.emailVerified ||
                  !identity.accounts.some(
                     (account) => account.providerId === 'google',
                  ))
            )
               return { eligibilityCode: 'GOOGLE_ACCOUNT_REQUIRED' } as const;
            if (
               subEvent.visibility === 'INTERNAL' &&
               (!identity.registrationCompletedAt ||
                  identity.membershipPeriods.length === 0)
            )
               return {
                  eligibilityCode: 'CURRENT_MEMBERSHIP_REQUIRED',
               } as const;

            const existing = await tx.registrationOrder.findFirst({
               where: {
                  subEventId,
                  buyerUserId: userId,
                  OR: [
                     {
                        status: {
                           in: ['DRAFT', 'AWAITING_MEMBERS', 'HOLDING'],
                        },
                     },
                     {
                        status: 'NEEDS_CORRECTION',
                        OR: [
                           { correctionDeadlineAt: null },
                           { correctionDeadlineAt: { gt: new Date() } },
                        ],
                     },
                  ],
               },
               include: {
                  ...detailInclude,
                  members: {
                     where: { userId, isBuyer: true },
                     include: {
                        user: { select: { name: true, email: true } },
                        claimedInvitation: {
                           select: {
                              tokenHash: true,
                              eventId: true,
                              subEventId: true,
                              claimedBy: true,
                              email: true,
                              status: true,
                           },
                        },
                     },
                  },
               },
               orderBy: { createdAt: 'desc' },
            });
            if (existing) {
               if (subEvent.visibility === 'INVITE_ONLY') {
                  const invitation = existing.members[0]?.claimedInvitation;
                  if (
                     !inviteTokenHash ||
                     !invitation ||
                     invitation.tokenHash !== inviteTokenHash ||
                     invitation.eventId !== subEvent.eventId ||
                     invitation.subEventId !== subEventId ||
                     invitation.claimedBy !== userId ||
                     invitation.status !== 'ACCEPTED' ||
                     invitation.email.toLowerCase() !==
                        identity.email.toLowerCase()
                  )
                     return {
                        eligibilityCode: 'INVITATION_INVALID',
                     } as const;
               }
               if (existing.submissions.length > 0) return existing;

               const forms = await tx.registrationForm.findMany({
                  where: {
                     subEventId,
                     status: 'PUBLISHED',
                     stage: 'REGISTRATION',
                     deletedAt: null,
                  },
                  select: {
                     id: true,
                     audience: true,
                     isRequired: true,
                     orderIndex: true,
                     questions: {
                        where: { status: 'ACTIVE' },
                        select: { fieldType: true },
                     },
                  },
               });
               if (
                  forms.some((form) =>
                     form.questions.some(
                        (question) => question.fieldType === 'FILE',
                     ),
                  )
               )
                  return {
                     unsupportedCode: 'UNSUPPORTED_FILE_QUESTION',
                  } as const;
               if (!existing.members[0]?.id) return existing;
               if (forms.length > 0)
                  await tx.registrationFormSubmission.createMany({
                     data: forms.map((form) => ({
                        registrationFormId: form.id,
                        registrationOrderId: existing.id,
                        orderMemberId: null,
                        assignmentAudience: 'BUYER',
                        assignmentRequired: true,
                        assignmentOrderIndex: form.orderIndex,
                     })),
                  });
               return await tx.registrationOrder.findUniqueOrThrow({
                  where: { id: existing.id },
                  include: detailInclude,
               });
            }

            if (subEvent.registrationMode === 'INTERNAL') {
               await tx.ticketPackage.upsert({
                  where: {
                     subEventId_code: {
                        subEventId,
                        code: 'FREE-INDIVIDUAL',
                     },
                  },
                  create: {
                     id: `free-default-${subEventId}`,
                     eventId: subEvent.eventId,
                     subEventId,
                     code: 'FREE-INDIVIDUAL',
                     name: 'Free individual registration',
                     description: 'Default one-seat free registration package',
                     status: 'ACTIVE',
                     seatCount: 1,
                     currency: 'IDR',
                     priceMinor: 0,
                  },
                  update: {},
               });
            }

            const now = new Date();
            const eligiblePackages = await tx.ticketPackage.findMany({
               where: {
                  subEventId,
                  ...(payload.packageId && { id: payload.packageId }),
                  status: 'ACTIVE',
                  OR: [{ salesStartAt: null }, { salesStartAt: { lte: now } }],
                  AND: [
                     {
                        OR: [{ salesEndAt: null }, { salesEndAt: { gt: now } }],
                     },
                  ],
               },
               orderBy: { createdAt: 'asc' },
            });
            if (!payload.packageId && eligiblePackages.length > 1)
               return { packageSelectionRequired: true } as const;
            const selectedPackage = eligiblePackages[0];
            if (!selectedPackage) return null;

            const forms = await tx.registrationForm.findMany({
               where: {
                  subEventId,
                  status: 'PUBLISHED',
                  stage: 'REGISTRATION',
                  deletedAt: null,
               },
               select: {
                  id: true,
                  audience: true,
                  isRequired: true,
                  orderIndex: true,
                  questions: {
                     where: { status: 'ACTIVE' },
                     select: { fieldType: true },
                  },
               },
            });
            if (
               forms.some((form) =>
                  form.questions.some(
                     (question) => question.fieldType === 'FILE',
                  ),
               )
            )
               return { unsupportedCode: 'UNSUPPORTED_FILE_QUESTION' } as const;
            const memberId = randomUUID();
            let invitationId: string | undefined;
            if (subEvent.visibility === 'INVITE_ONLY') {
               if (!inviteTokenHash || !identity.emailVerified)
                  return { eligibilityCode: 'INVITATION_REQUIRED' } as const;
               const invitation = await tx.registrationInvitation.findFirst({
                  where: {
                     eventId: subEvent.eventId,
                     subEventId,
                     tokenHash: inviteTokenHash,
                     email: { equals: identity.email, mode: 'insensitive' },
                     status: 'PENDING',
                     expiresAt: { gt: now },
                     claimedBy: null,
                     orderMemberId: null,
                  },
                  select: { id: true },
               });
               if (!invitation)
                  return { eligibilityCode: 'INVITATION_INVALID' } as const;
               invitationId = invitation.id;
            }
            const memberDeadlineAt = new Date(
               now.getTime() + subEvent.memberDeadlineHours * 60 * 60 * 1000,
            );
            const invitationEmails = payload.invitationEmails ?? [];
            if (invitationEmails.length > selectedPackage.seatCount - 1)
               return { invitationCountMismatch: true } as const;
            if (
               new Set(invitationEmails).size !== invitationEmails.length ||
               invitationEmails.includes(identity.email.toLowerCase())
            )
               return { invitationEmailConflict: true } as const;
            const consumed = await tx.registrationOrder.aggregate({
               where: {
                  subEventId,
                  status: { in: [...capacityConsumingStatuses] },
               },
               _sum: { seatCount: true },
            });
            const liveHolds = await tx.registrationCapacityHold.aggregate({
               where: {
                  subEventId,
                  status: 'ACTIVE',
                  expiresAt: { gt: now },
                  order: {
                     status: { notIn: [...capacityConsumingStatuses] },
                  },
               },
               _sum: { quantity: true },
            });
            if (
               subEvent.maxParticipants !== null &&
               (consumed._sum.seatCount ?? 0) +
                  (liveHolds._sum.quantity ?? 0) +
                  selectedPackage.seatCount >
                  subEvent.maxParticipants
            )
               return { capacityExceeded: true } as const;
            const initialInvitations = invitationEmails.map((email, index) => ({
               email,
               position: index + 1,
               ...createInvitationToken(),
            }));
            const created = await tx.registrationOrder.create({
               data: {
                  orderNumber: `REG-${Date.now()}-${randomUUID().slice(0, 8)}`,
                  eventId: subEvent.eventId,
                  subEventId,
                  ticketPackageId: selectedPackage.id,
                  buyerUserId: userId,
                  seatCount: selectedPackage.seatCount,
                  currency: selectedPackage.currency,
                  subtotalMinor: selectedPackage.priceMinor,
                  totalMinor: selectedPackage.priceMinor,
                  status:
                     selectedPackage.seatCount === 1
                        ? 'HOLDING'
                        : 'AWAITING_MEMBERS',
                  memberDeadlineAt,
                  members: {
                     create: {
                        id: memberId,
                        subEventId,
                        userId,
                        status: 'READY',
                        isBuyer: true,
                        position: 0,
                        acceptedAt: now,
                        readyAt: now,
                     },
                  },
                  submissions: {
                     create: forms.map((form) => ({
                        registrationFormId: form.id,
                        assignmentAudience: 'BUYER',
                        assignmentRequired: true,
                        assignmentOrderIndex: form.orderIndex,
                        orderMemberId: null,
                     })),
                  },
                  capacityHolds: {
                     create: {
                        id: `assembly-${randomUUID()}`,
                        subEventId,
                        quantity: selectedPackage.seatCount,
                        status: 'ACTIVE',
                        expiresAt: memberDeadlineAt,
                     },
                  },
                  invitations: {
                     create: initialInvitations.map((invitation) => ({
                        eventId: subEvent.eventId,
                        subEventId,
                        email: invitation.email,
                        tokenHash: invitation.tokenHash,
                        status: 'PENDING',
                        sentBy: userId,
                        slotPosition: invitation.position,
                        expiresAt: memberDeadlineAt,
                     })),
                  },
               },
               include: detailInclude,
            });
            if (invitationId) {
               const claimed = await tx.registrationInvitation.updateMany({
                  where: {
                     id: invitationId,
                     status: 'PENDING',
                     claimedBy: null,
                     orderMemberId: null,
                     expiresAt: { gt: now },
                  },
                  data: {
                     status: 'ACCEPTED',
                     claimedBy: userId,
                     orderMemberId: memberId,
                     acceptedAt: now,
                  },
               });
               if (claimed.count !== 1)
                  throw new ResponseRevisionConflict(
                     'Invitation claim conflict',
                  );
            }
            return { created, initialInvitations } as const;
         },
         { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
   }

   async listOwned(userId: string, params: RegistrationPagination) {
      await prisma.$transaction((tx) =>
         this.expireAssemblyOrders(tx, {
            OR: [{ buyerUserId: userId }, { members: { some: { userId } } }],
         }),
      );
      const where: Prisma.RegistrationOrderWhereInput = {
         OR: [{ buyerUserId: userId }, { members: { some: { userId } } }],
      };
      const [data, total] = await prisma.$transaction([
         prisma.registrationOrder.findMany({
            where,
            skip: (params.page - 1) * params.limit,
            take: params.limit,
            orderBy: { createdAt: 'desc' },
            select: {
               id: true,
               orderNumber: true,
               status: true,
               createdAt: true,
               submittedAt: true,
               cancelledAt: true,
               event: { select: { id: true, name: true } },
               subEvent: { select: { id: true, name: true, date: true } },
               ticketPackage: { select: packageSelect },
            },
         }),
         prisma.registrationOrder.count({ where }),
      ]);
      return { data, total };
   }

   async findOwned(registrationId: string, userId: string) {
      await this.expireForRegistration(registrationId);
      return prisma.registrationOrder.findFirst({
         where: {
            id: registrationId,
            OR: [{ buyerUserId: userId }, { members: { some: { userId } } }],
         },
         include: detailInclude,
      });
   }

   async replaceResponses(
      registrationId: string,
      userId: string,
      payload: ReplaceResponsesRequest,
   ) {
      return prisma.$transaction(
         async (tx) => {
            await this.expireAssemblyOrders(tx, { id: registrationId });
            const scope = await tx.registrationOrder.findFirst({
               where: {
                  id: registrationId,
                  OR: [
                     { buyerUserId: userId },
                     { members: { some: { userId } } },
                  ],
               },
               select: { subEventId: true },
            });
            if (!scope) return null;
            await tx.$queryRaw`SELECT "id" FROM "subevents" WHERE "id" = ${scope.subEventId} FOR UPDATE`;
            await this.expireAssemblyOrders(tx, { id: registrationId });
            const order = await tx.registrationOrder.findFirst({
               where: {
                  id: registrationId,
                  OR: [
                     { buyerUserId: userId },
                     { members: { some: { userId } } },
                  ],
                  status: {
                     in: [
                        'DRAFT',
                        'AWAITING_MEMBERS',
                        'HOLDING',
                        'NEEDS_CORRECTION',
                     ],
                  },
               },
               select: {
                  id: true,
                  buyerUserId: true,
                  status: true,
                  correctionDeadlineAt: true,
                  members: {
                     where: { userId, status: { not: 'CANCELLED' } },
                     select: { id: true, isBuyer: true },
                  },
                  invitations: {
                     select: { id: true, status: true, expiresAt: true },
                  },
               },
            });
            if (!order) return null;
            if (
               order.status === 'NEEDS_CORRECTION' &&
               order.correctionDeadlineAt &&
               new Date() >= order.correctionDeadlineAt
            )
               throw new ResponseCorrectionDeadlinePassed();
            const ownMemberIds = new Set(
               order.members.map((member) => member.id),
            );

            for (const replacement of payload.submissions) {
               const submission = await tx.registrationFormSubmission.findFirst(
                  {
                     where: {
                        id: replacement.submissionId,
                        registrationOrderId: registrationId,
                        OR: [
                           { orderMemberId: { in: [...ownMemberIds] } },
                           ...(order.buyerUserId === userId
                              ? [{ orderMemberId: null }]
                              : []),
                        ],
                     },
                     include: {
                        form: {
                           include: {
                              questions: {
                                 where: { status: 'ACTIVE' },
                                 include: {
                                    options: { where: { isActive: true } },
                                 },
                              },
                           },
                        },
                     },
                  },
               );
               if (!submission) throw new ResponseAccessDenied();
               const freshAnswers = replacement.answers.map((answer) => ({
                  formQuestionId: answer.questionId,
                  textValue:
                     answer.type === 'TEXT' || answer.type === 'TEXTAREA'
                        ? answer.value
                        : null,
                  numberValue:
                     answer.type === 'NUMBER'
                        ? new Prisma.Decimal(answer.value)
                        : null,
                  dateValue:
                     answer.type === 'DATE'
                        ? new Date(`${answer.value}T00:00:00.000Z`)
                        : null,
                  selectedOptions:
                     'optionIds' in answer
                        ? answer.optionIds.map((optionId) => ({ optionId }))
                        : 'optionId' in answer
                          ? [{ optionId: answer.optionId }]
                          : [],
               }));
               const questionTypes = new Map(
                  submission.form.questions.map((question) => [
                     question.id,
                     question.fieldType,
                  ]),
               );
               const contractErrors = replacement.answers.flatMap((answer) => {
                  const expectedType = questionTypes.get(answer.questionId);
                  if (!expectedType)
                     return [
                        {
                           questionId: answer.questionId,
                           code: 'INVALID_QUESTION',
                           message:
                              'Question is not assigned to this submission',
                        },
                     ];
                  if (expectedType === 'FILE')
                     return [
                        {
                           questionId: answer.questionId,
                           code: 'UNSUPPORTED_FILE_QUESTION',
                           message: 'File questions are not supported',
                        },
                     ];
                  if (expectedType !== answer.type)
                     return [
                        {
                           questionId: answer.questionId,
                           code: 'ANSWER_TYPE_MISMATCH',
                           message: `Expected ${expectedType} answer`,
                        },
                     ];
                  return [];
               });
               const validationErrors = validateFreshSubmission(
                  submission.form.questions,
                  freshAnswers,
                  submission.assignmentRequired,
               );
               if (contractErrors.length > 0 || validationErrors.length > 0)
                  throw new ResponseValidationFailure([
                     ...contractErrors,
                     ...validationErrors,
                  ]);
               const changed = await tx.registrationFormSubmission.updateMany({
                  where: {
                     id: replacement.submissionId,
                     registrationOrderId: registrationId,
                     revision: replacement.revision,
                  },
                  data: { revision: { increment: 1 } },
               });
               if (changed.count !== 1) throw new ResponseRevisionConflict();
               await tx.registrationFormSubmissionAnswer.deleteMany({
                  where: { submissionId: replacement.submissionId },
               });
               for (const answer of replacement.answers) {
                  const optionIds =
                     'optionIds' in answer
                        ? answer.optionIds
                        : 'optionId' in answer
                          ? [answer.optionId]
                          : [];
                  await tx.registrationFormSubmissionAnswer.create({
                     data: {
                        submissionId: replacement.submissionId,
                        formQuestionId: answer.questionId,
                        textValue:
                           answer.type === 'TEXT' || answer.type === 'TEXTAREA'
                              ? answer.value
                              : null,
                        numberValue:
                           answer.type === 'NUMBER'
                              ? new Prisma.Decimal(answer.value)
                              : null,
                        dateValue:
                           answer.type === 'DATE'
                              ? new Date(`${answer.value}T00:00:00.000Z`)
                              : null,
                        selectedOptions:
                           optionIds.length > 0
                              ? {
                                   create: optionIds.map((optionId) => ({
                                      optionId,
                                   })),
                                }
                              : undefined,
                     },
                  });
               }
            }
            return tx.registrationOrder.findUnique({
               where: { id: registrationId },
               include: detailInclude,
            });
         },
         { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
   }

   async submit(
      registrationId: string,
      userId: string,
      idempotencyKey: string,
      fingerprint: string,
   ) {
      return prisma.$transaction(
         async (tx) => {
            const scope = await tx.registrationOrder.findFirst({
               where: { id: registrationId, buyerUserId: userId },
               select: { subEventId: true },
            });
            if (!scope) return null;
            await tx.$queryRaw`SELECT "id" FROM "subevents" WHERE "id" = ${scope.subEventId} FOR UPDATE`;
            await this.expireAssemblyOrders(tx, { id: registrationId });

            const replay = await tx.registrationOrder.findFirst({
               where: {
                  id: registrationId,
                  buyerUserId: userId,
                  idempotencyKey,
                  idempotencyFingerprint: fingerprint,
               },
               include: detailInclude,
            });
            if (replay) return { order: replay, replay: true } as const;

            const conflictingKey = await tx.registrationOrder.findFirst({
               where: { idempotencyKey, id: { not: registrationId } },
               select: { id: true },
            });
            if (conflictingKey) return { idempotencyConflict: true } as const;

            const order = await tx.registrationOrder.findFirst({
               where: { id: registrationId, buyerUserId: userId },
               include: {
                  subEvent: {
                     include: { event: { select: { status: true } } },
                  },
                  ticketPackage: true,
                  buyer: {
                     select: {
                        email: true,
                        emailVerified: true,
                        status: true,
                        registrationCompletedAt: true,
                        accounts: { select: { providerId: true } },
                        membershipPeriods: {
                           where: {
                              isCurrent: true,
                              period: { isActive: true },
                           },
                           select: { periodId: true },
                           take: 1,
                        },
                     },
                  },
                  members: {
                     include: {
                        claimedInvitation: {
                           select: {
                              eventId: true,
                              subEventId: true,
                              email: true,
                              status: true,
                              claimedBy: true,
                              expiresAt: true,
                           },
                        },
                     },
                  },
                  submissions: {
                     include: {
                        form: {
                           include: {
                              questions: {
                                 where: { status: 'ACTIVE' },
                                 include: {
                                    options: { where: { isActive: true } },
                                 },
                              },
                           },
                        },
                        answers: { include: { selectedOptions: true } },
                     },
                  },
                  invitations: {
                     select: { id: true, status: true, expiresAt: true },
                  },
                  payment: { select: { status: true } },
               },
            });
            if (!order) return null;
            if (
               ![
                  'DRAFT',
                  'AWAITING_MEMBERS',
                  'HOLDING',
                  'NEEDS_CORRECTION',
               ].includes(order.status)
            )
               return { lifecycleConflict: true } as const;
            const isCorrection = order.status === 'NEEDS_CORRECTION';

            const eligibilityNow = new Date();
            if (
               isCorrection &&
               order.correctionDeadlineAt &&
               eligibilityNow >= order.correctionDeadlineAt
            )
               return { lifecycleConflict: true } as const;
            if (
               !isCorrection &&
               (order.subEvent.event.status !== 'PUBLISHED' ||
                  order.subEvent.status !== 'OPEN' ||
                  order.subEvent.registrationMode !== 'INTERNAL' ||
                  !order.subEvent.isRegistrationOpen ||
                  (order.subEvent.registrationOpensAt &&
                     eligibilityNow < order.subEvent.registrationOpensAt) ||
                  (order.subEvent.registrationClosesAt &&
                     eligibilityNow >= order.subEvent.registrationClosesAt))
            )
               return { registrationClosed: true } as const;
            if (
               order.members.filter((member) => member.status !== 'CANCELLED')
                  .length !== order.seatCount ||
               order.invitations.some(
                  (invitation) => invitation.status === 'PENDING',
               ) ||
               (order.memberDeadlineAt &&
                  eligibilityNow >= order.memberDeadlineAt)
            )
               return { membersIncomplete: true } as const;
            if (
               !isCorrection &&
               (order.ticketPackage.status !== 'ACTIVE' ||
                  (order.ticketPackage.salesStartAt &&
                     eligibilityNow < order.ticketPackage.salesStartAt) ||
                  (order.ticketPackage.salesEndAt &&
                     eligibilityNow >= order.ticketPackage.salesEndAt))
            )
               return { packageUnavailable: true } as const;
            if (order.buyer.status !== 'ACTIVE')
               return { eligibilityCode: 'ACCOUNT_INACTIVE' } as const;
            if (
               order.subEvent.visibility === 'PUBLIC' &&
               (!order.buyer.emailVerified ||
                  !order.buyer.accounts.some(
                     (account) => account.providerId === 'google',
                  ))
            )
               return { eligibilityCode: 'GOOGLE_ACCOUNT_REQUIRED' } as const;
            if (
               order.subEvent.visibility === 'INTERNAL' &&
               (!order.buyer.registrationCompletedAt ||
                  order.buyer.membershipPeriods.length === 0)
            )
               return {
                  eligibilityCode: 'CURRENT_MEMBERSHIP_REQUIRED',
               } as const;
            if (order.subEvent.visibility === 'INVITE_ONLY') {
               const buyerMember = order.members.find(
                  (member) => member.userId === userId && member.isBuyer,
               );
               const invitation = buyerMember?.claimedInvitation;
               if (
                  !invitation ||
                  invitation.eventId !== order.eventId ||
                  invitation.subEventId !== order.subEventId ||
                  invitation.status !== 'ACCEPTED' ||
                  invitation.claimedBy !== userId ||
                  invitation.expiresAt <= eligibilityNow ||
                  invitation.email.toLowerCase() !==
                     order.buyer.email.toLowerCase()
               )
                  return { eligibilityCode: 'INVITATION_INVALID' } as const;
            }

            const now = new Date();
            const expiredPayments = await tx.registrationPayment.findMany({
               where: {
                  order: { subEventId: order.subEventId },
                  status: { in: ['UNPAID', 'REJECTED'] },
                  expiresAt: { lte: now },
               },
               select: { id: true, registrationOrderId: true, status: true },
            });
            if (expiredPayments.length) {
               await tx.registrationPayment.updateMany({
                  where: { id: { in: expiredPayments.map((item) => item.id) } },
                  data: { status: 'EXPIRED', revision: { increment: 1 } },
               });
               await tx.registrationOrder.updateMany({
                  where: {
                     id: {
                        in: expiredPayments.map(
                           (item) => item.registrationOrderId,
                        ),
                     },
                     status: 'PENDING_PAYMENT',
                  },
                  data: { status: 'EXPIRED', revision: { increment: 1 } },
               });
               await tx.registrationCapacityHold.updateMany({
                  where: {
                     registrationOrderId: {
                        in: expiredPayments.map(
                           (item) => item.registrationOrderId,
                        ),
                     },
                     status: 'ACTIVE',
                  },
                  data: { status: 'EXPIRED', releasedAt: now },
               });
               await tx.registrationPaymentHistory.createMany({
                  data: expiredPayments.map((item) => ({
                     paymentId: item.id,
                     fromStatus: item.status,
                     toStatus: 'EXPIRED' as const,
                     reason: 'Payment deadline expired',
                  })),
               });
            }
            const answerErrors = order.submissions.flatMap((submission) =>
               validateFreshSubmission(
                  submission.form.questions,
                  submission.answers,
                  submission.assignmentRequired,
               ),
            );
            if (answerErrors.length > 0)
               return { validationErrors: answerErrors } as const;

            const consumed = await tx.registrationOrder.aggregate({
               where: {
                  subEventId: order.subEventId,
                  status: { in: [...capacityConsumingStatuses] },
                  id: { not: order.id },
               },
               _sum: { seatCount: true },
            });
            const activeHolds = await tx.registrationCapacityHold.aggregate({
               where: {
                  subEventId: order.subEventId,
                  status: 'ACTIVE',
                  expiresAt: { gt: new Date() },
                  registrationOrderId: { not: order.id },
                  order: {
                     status: { notIn: [...capacityConsumingStatuses] },
                  },
               },
               _sum: { quantity: true },
            });
            const used =
               (consumed._sum.seatCount ?? 0) +
               (activeHolds._sum.quantity ?? 0);
            if (
               order.subEvent.maxParticipants !== null &&
               used + order.seatCount > order.subEvent.maxParticipants
            )
               return { capacityExceeded: true } as const;

            const isPaid = order.totalMinor > 0n;
            const nextStatus =
               isCorrection && isPaid
                  ? correctionResubmissionStatus(
                       order.payment?.status ?? null,
                       order.subEvent.approvalMode,
                    )
                  : isPaid
                    ? 'PENDING_PAYMENT'
                    : order.subEvent.approvalMode === 'AUTO_APPROVE'
                      ? 'APPROVED'
                      : 'PENDING_APPROVAL';
            if (!nextStatus) return { lifecycleConflict: true } as const;
            const paymentDeadlineAt =
               isPaid && !isCorrection
                  ? new Date(
                       now.getTime() +
                          order.subEvent.paymentDeadlineHours * 60 * 60 * 1000,
                    )
                  : null;
            if (!isCorrection)
               await tx.registrationCapacityHold.updateMany({
                  where: { registrationOrderId: order.id, status: 'ACTIVE' },
                  data: {
                     status: isPaid ? 'ACTIVE' : 'CONSUMED',
                     expiresAt: paymentDeadlineAt ?? now,
                     consumedAt: isPaid ? null : now,
                  },
               });
            if (isPaid && !isCorrection) {
               const bankSnapshot = {
                  bankName: order.subEvent.paymentBankName,
                  accountHolder: order.subEvent.paymentAccountHolder,
                  accountNumber: order.subEvent.paymentAccountNumberCanonical,
                  instructions: order.subEvent.paymentInstructions,
                  acceptedProofTypes: order.subEvent.paymentProofTypes,
                  maxProofBytes: order.subEvent.paymentProofMaxBytes,
               } satisfies Prisma.InputJsonObject;
               if (
                  !bankSnapshot.bankName ||
                  !bankSnapshot.accountHolder ||
                  !bankSnapshot.accountNumber
               )
                  return { packageUnavailable: true } as const;
               await tx.registrationPayment.create({
                  data: {
                     registrationOrderId: order.id,
                     status: 'UNPAID',
                     currency: order.currency,
                     amountMinor: order.totalMinor,
                     bankSnapshot,
                     expiresAt: paymentDeadlineAt,
                     history: { create: { toStatus: 'UNPAID' } },
                  },
               });
            }
            await tx.registrationFormSubmission.updateMany({
               where: { registrationOrderId: order.id },
               data: { status: 'SUBMITTED', submittedAt: now },
            });
            await tx.registrationStatusHistory.create({
               data: {
                  registrationOrderId: order.id,
                  entityType: 'ORDER',
                  entityId: order.id,
                  fromStatus: order.status,
                  toStatus: nextStatus,
                  actorUserId: userId,
               },
            });
            const updated = await tx.registrationOrder.update({
               where: { id: order.id },
               data: {
                  status: nextStatus,
                  revision: { increment: 1 },
                  idempotencyKey,
                  idempotencyFingerprint: fingerprint,
                  submittedAt: now,
                  approvedAt: nextStatus === 'APPROVED' ? now : null,
                  ...(!isCorrection && { paymentDeadlineAt }),
               },
               include: detailInclude,
            });
            if (nextStatus === 'APPROVED')
               await assignPublishedPostRegistrationForms(tx, {
                  orderIds: [order.id],
               });
            if (nextStatus === 'APPROVED')
               await issueTicketsForApprovedOrder(tx, order.id);
            return { order: updated, replay: false } as const;
         },
         { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
   }

   async cancel(registrationId: string, userId: string, reason?: string) {
      return prisma.$transaction(
         async (tx) => {
            const scope = await tx.registrationOrder.findFirst({
               where: { id: registrationId, buyerUserId: userId },
               select: { subEventId: true },
            });
            if (!scope) return null;
            await tx.$queryRaw`SELECT "id" FROM "subevents" WHERE "id" = ${scope.subEventId} FOR UPDATE`;
            const order = await tx.registrationOrder.findFirst({
               where: { id: registrationId, buyerUserId: userId },
               include: { subEvent: true },
            });
            if (!order) return null;
            if (order.status === 'CANCELLED') {
               return tx.registrationOrder.findUnique({
                  where: { id: order.id },
                  include: detailInclude,
               });
            }
            if (order.status === 'APPROVED') {
               return { unavailable: true } as const;
            }
            if (
               !(['DRAFT', ...activeRegistrationStatuses] as string[]).includes(
                  order.status,
               )
            ) {
               return { unavailable: true } as const;
            }
            const now = new Date();
            if (
               order.subEvent.cancellationClosesAt &&
               now >= order.subEvent.cancellationClosesAt
            ) {
               return { deadlinePassed: true } as const;
            }
            await tx.registrationCapacityHold.updateMany({
               where: {
                  registrationOrderId: order.id,
                  status: { in: ['ACTIVE', 'CONSUMED'] },
               },
               data: { status: 'RELEASED', releasedAt: now },
            });
            await tx.registrationOrderMember.updateMany({
               where: { registrationOrderId: order.id },
               data: { status: 'CANCELLED' },
            });
            await tx.registrationInvitation.updateMany({
               where: {
                  registrationOrderId: order.id,
                  status: 'PENDING',
               },
               data: { status: 'REVOKED' },
            });
            await tx.registrationTicket.updateMany({
               where: {
                  orderMember: { registrationOrderId: order.id },
                  status: { in: ['PENDING', 'ACTIVE'] },
               },
               data: { status: 'REVOKED', revokedAt: now },
            });
            await tx.registrationPayment.updateMany({
               where: {
                  registrationOrderId: order.id,
                  status: { in: ['UNPAID', 'PROOF_SUBMITTED', 'REJECTED'] },
               },
               data: { status: 'CANCELLED', revision: { increment: 1 } },
            });
            if (
               ['DRAFT', 'AWAITING_MEMBERS', 'HOLDING'].includes(order.status)
            ) {
               await tx.registrationInvitation.updateMany({
                  where: {
                     orderMember: { registrationOrderId: order.id },
                     registrationOrderId: null,
                     status: 'ACCEPTED',
                     claimedBy: userId,
                  },
                  data: {
                     status: 'PENDING',
                     claimedBy: null,
                     orderMemberId: null,
                     acceptedAt: null,
                  },
               });
            }
            await tx.registrationStatusHistory.create({
               data: {
                  registrationOrderId: order.id,
                  entityType: 'ORDER',
                  entityId: order.id,
                  fromStatus: order.status,
                  toStatus: 'CANCELLED',
                  actorUserId: userId,
                  reason,
               },
            });
            return tx.registrationOrder.update({
               where: { id: order.id },
               data: {
                  status: 'CANCELLED',
                  revision: { increment: 1 },
                  cancelledAt: now,
                  cancellationReason: reason,
               },
               include: detailInclude,
            });
         },
         { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
   }

   async invitationContext(tokenHash: string, userId: string) {
      return prisma.$transaction(async (tx) => {
         const invitation = await tx.registrationInvitation.findUnique({
            where: { tokenHash },
            include: {
               order: {
                  include: {
                     event: { select: { id: true, name: true } },
                     subEvent: { select: { id: true, name: true, date: true } },
                     ticketPackage: { select: packageSelect },
                     buyer: { select: { name: true } },
                  },
               },
            },
         });
         if (invitation?.registrationOrderId)
            await this.expireAssemblyOrders(tx, {
               id: invitation.registrationOrderId,
            });
         const refreshed = invitation
            ? await tx.registrationInvitation.findUnique({
                 where: { id: invitation.id },
                 include: {
                    order: {
                       include: {
                          event: { select: { id: true, name: true } },
                          subEvent: {
                             select: { id: true, name: true, date: true },
                          },
                          ticketPackage: { select: packageSelect },
                          buyer: { select: { name: true } },
                       },
                    },
                 },
              })
            : null;
         if (!refreshed?.order) return null;
         const user = await tx.user.findUnique({
            where: { id: userId },
            select: { email: true, emailVerified: true, status: true },
         });
         if (
            !user ||
            user.status !== 'ACTIVE' ||
            !user.emailVerified ||
            user.email.toLowerCase() !== refreshed.email.toLowerCase()
         )
            return { eligibilityCode: 'INVITATION_EMAIL_MISMATCH' } as const;
         return refreshed;
      });
   }

   async createInvitation(
      registrationOrderId: string,
      buyerUserId: string,
      email: string,
      position: number,
   ) {
      const credentials = createInvitationToken();
      const result = await prisma.$transaction(
         async (tx) => {
            await this.expireAssemblyOrders(tx, { id: registrationOrderId });
            const scope = await tx.registrationOrder.findFirst({
               where: { id: registrationOrderId, buyerUserId },
               select: { subEventId: true },
            });
            if (!scope) return null;
            await tx.$queryRaw`SELECT "id" FROM "subevents" WHERE "id" = ${scope.subEventId} FOR UPDATE`;
            await this.expireAssemblyOrders(tx, { id: registrationOrderId });
            const order = await tx.registrationOrder.findFirst({
               where: {
                  id: registrationOrderId,
                  buyerUserId,
                  status: { in: ['DRAFT', 'AWAITING_MEMBERS', 'HOLDING'] },
                  memberDeadlineAt: { gt: new Date() },
               },
               include: { members: true, invitations: true },
            });
            if (!order) return null;
            const normalizedEmail = email.trim().toLowerCase();
            const buyer = await tx.user.findUniqueOrThrow({
               where: { id: buyerUserId },
               select: { email: true },
            });
            if (normalizedEmail === buyer.email.toLowerCase())
               return { emailConflict: true } as const;
            if (position <= 0 || position >= order.seatCount)
               return { invalidPosition: true } as const;
            if (
               order.members.some(
                  (member) =>
                     member.position === position &&
                     member.status !== 'CANCELLED',
               ) ||
               order.invitations.some(
                  (invitation) =>
                     ['PENDING', 'ACCEPTED'].includes(invitation.status) &&
                     (invitation.slotPosition === position ||
                        invitation.email.toLowerCase() === normalizedEmail),
               )
            )
               return { occupied: true } as const;
            return tx.registrationInvitation.create({
               data: {
                  eventId: order.eventId,
                  subEventId: order.subEventId,
                  registrationOrderId,
                  slotPosition: position,
                  email: normalizedEmail,
                  tokenHash: credentials.tokenHash,
                  status: 'PENDING',
                  sentBy: buyerUserId,
                  expiresAt: order.memberDeadlineAt!,
               },
            });
         },
         { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
      return { result, token: credentials.token };
   }

   async resendInvitation(
      registrationOrderId: string,
      invitationId: string,
      buyerUserId: string,
      email?: string,
   ) {
      const credentials = createInvitationToken();
      return prisma.$transaction(
         async (tx) => {
            const scope = await tx.registrationOrder.findFirst({
               where: { id: registrationOrderId, buyerUserId },
               select: { subEventId: true },
            });
            if (!scope) return null;
            await tx.$queryRaw`SELECT "id" FROM "subevents" WHERE "id" = ${scope.subEventId} FOR UPDATE`;
            await this.expireAssemblyOrders(tx, { id: registrationOrderId });
            const current = await tx.registrationInvitation.findFirst({
               where: {
                  id: invitationId,
                  registrationOrderId,
                  order: {
                     buyerUserId,
                     status: { in: ['DRAFT', 'AWAITING_MEMBERS', 'HOLDING'] },
                     memberDeadlineAt: { gt: new Date() },
                  },
                  status: { in: ['PENDING', 'DECLINED', 'EXPIRED', 'REVOKED'] },
               },
               include: {
                  order: { select: { buyer: { select: { email: true } } } },
               },
            });
            if (!current?.order) return null;
            const normalizedEmail = (email ?? current.email)
               .trim()
               .toLowerCase();
            if (normalizedEmail === current.order.buyer.email.toLowerCase())
               return { emailConflict: true } as const;
            const duplicate = await tx.registrationInvitation.count({
               where: {
                  registrationOrderId,
                  id: { not: invitationId },
                  email: { equals: normalizedEmail, mode: 'insensitive' },
                  status: { in: ['PENDING', 'ACCEPTED'] },
               },
            });
            if (duplicate) return { emailConflict: true } as const;
            const changed = await tx.registrationInvitation.updateMany({
               where: { id: invitationId, status: current.status },
               data: {
                  email: normalizedEmail,
                  tokenHash: credentials.tokenHash,
                  status: 'PENDING',
                  claimedBy: null,
                  orderMemberId: null,
                  acceptedAt: null,
               },
            });
            if (changed.count !== 1) return { conflict: true } as const;
            return {
               invitation: await tx.registrationInvitation.findUniqueOrThrow({
                  where: { id: invitationId },
               }),
               token: credentials.token,
            };
         },
         { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
   }

   async revokeInvitation(
      registrationOrderId: string,
      invitationId: string,
      buyerUserId: string,
   ) {
      await this.expireForRegistration(registrationOrderId);
      const changed = await prisma.registrationInvitation.updateMany({
         where: {
            id: invitationId,
            registrationOrderId,
            status: 'PENDING',
            order: { buyerUserId },
         },
         data: { status: 'REVOKED' },
      });
      return changed.count === 1
         ? prisma.registrationInvitation.findUnique({
              where: { id: invitationId },
           })
         : null;
   }

   async decideInvitation(tokenHash: string, userId: string, accept: boolean) {
      return prisma.$transaction(
         async (tx) => {
            const invitationScope = await tx.registrationInvitation.findUnique({
               where: { tokenHash },
               select: { registrationOrderId: true },
            });
            if (!invitationScope?.registrationOrderId) return null;
            const orderScope = await tx.registrationOrder.findUnique({
               where: { id: invitationScope.registrationOrderId },
               select: { subEventId: true },
            });
            if (!orderScope) return null;
            await tx.$queryRaw`SELECT "id" FROM "subevents" WHERE "id" = ${orderScope.subEventId} FOR UPDATE`;
            await this.expireAssemblyOrders(tx, {
               id: invitationScope.registrationOrderId,
            });
            const invitation = await tx.registrationInvitation.findUnique({
               where: { tokenHash },
               include: {
                  order: {
                     include: {
                        members: true,
                        event: { select: { status: true } },
                        subEvent: true,
                     },
                  },
               },
            });
            if (!invitation?.order || invitation.status !== 'PENDING')
               return null;
            const now = new Date();
            const order = invitation.order;
            if (
               !['DRAFT', 'AWAITING_MEMBERS', 'HOLDING'].includes(
                  order.status,
               ) ||
               !order.memberDeadlineAt ||
               order.memberDeadlineAt <= now ||
               invitation.expiresAt <= now ||
               order.event.status !== 'PUBLISHED' ||
               order.subEvent.status !== 'OPEN' ||
               order.subEvent.registrationMode !== 'INTERNAL' ||
               !order.subEvent.isRegistrationOpen ||
               (order.subEvent.registrationOpensAt &&
                  now < order.subEvent.registrationOpensAt) ||
               (order.subEvent.registrationClosesAt &&
                  now >= order.subEvent.registrationClosesAt)
            )
               return { conflict: true } as const;
            const user = await tx.user.findUnique({
               where: { id: userId },
               select: { email: true, emailVerified: true, status: true },
            });
            if (
               !user ||
               user.status !== 'ACTIVE' ||
               !user.emailVerified ||
               user.email.toLowerCase() !== invitation.email.toLowerCase()
            )
               return { eligibilityCode: 'INVITATION_EMAIL_MISMATCH' } as const;
            if (!accept) {
               const changed = await tx.registrationInvitation.updateMany({
                  where: { id: invitation.id, status: 'PENDING' },
                  data: { status: 'DECLINED' },
               });
               if (changed.count !== 1) return { conflict: true } as const;
               return tx.registrationInvitation.findUniqueOrThrow({
                  where: { id: invitation.id },
               });
            }
            const position = invitation.slotPosition!;
            if (
               order.members.some(
                  (member) =>
                     member.status !== 'CANCELLED' &&
                     (member.userId === userId || member.position === position),
               )
            )
               return { conflict: true } as const;
            const member = await tx.registrationOrderMember.create({
               data: {
                  registrationOrderId: order.id,
                  subEventId: invitation.subEventId,
                  userId,
                  position,
                  status: 'READY',
                  isBuyer: false,
                  acceptedAt: now,
                  readyAt: now,
               },
            });
            const templates = await tx.registrationFormSubmission.findMany({
               where: {
                  registrationOrderId: order.id,
                  assignmentAudience: {
                     in: ['EACH_ATTENDEE', 'ALL_ORDER_MEMBERS'],
                  },
               },
               distinct: ['registrationFormId', 'assignmentAudience'],
            });
            if (templates.length)
               await tx.registrationFormSubmission.createMany({
                  data: templates.map((template) => ({
                     registrationFormId: template.registrationFormId,
                     registrationOrderId: order.id,
                     orderMemberId: member.id,
                     assignmentAudience: template.assignmentAudience,
                     assignmentRequired: template.assignmentRequired,
                     assignmentOrderIndex: template.assignmentOrderIndex,
                  })),
               });
            const claimed = await tx.registrationInvitation.updateMany({
               where: { id: invitation.id, status: 'PENDING' },
               data: {
                  status: 'ACCEPTED',
                  claimedBy: userId,
                  orderMemberId: member.id,
                  acceptedAt: now,
               },
            });
            if (claimed.count !== 1) throw new ResponseRevisionConflict();
            const activeCount =
               order.members.filter((item) => item.status !== 'CANCELLED')
                  .length + 1;
            if (activeCount === order.seatCount)
               await tx.registrationOrder.update({
                  where: { id: order.id },
                  data: { status: 'HOLDING', revision: { increment: 1 } },
               });
            return tx.registrationOrder.findUnique({
               where: { id: order.id },
               include: detailInclude,
            });
         },
         { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
   }
}

export const eventRegistrationRepository = new EventRegistrationRepository();
