import { randomUUID } from 'node:crypto';
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
   ResponseRevisionConflict,
   ResponseValidationFailure,
   validateFreshSubmission,
} from './eventRegistrationTypes.js';
import { assignPublishedPostRegistrationForms } from '@/features/post-registration-forms/postRegistrationFormRepository.js';

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
   status: true,
   salesStartAt: true,
   salesEndAt: true,
} satisfies Prisma.TicketPackageSelect;

const formInclude = {
   form: {
      include: {
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
      },
   },
} satisfies Prisma.RegistrationFormAssignmentInclude;

const detailInclude = {
   event: { select: { id: true, name: true } },
   subEvent: { select: { id: true, name: true, date: true } },
   ticketPackage: { select: packageSelect },
   members: {
      select: { id: true, userId: true, isBuyer: true, status: true },
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
               submissions: { select: { status: true } },
            },
         }),
         prisma.registrationOrder.count({ where }),
      ]);
      return { data, total };
   }

   async capacitySummary(subEventId: string) {
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
         },
      });
   }

   async findInternal(registrationId: string) {
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
               payload.items.some((item) => {
                  const order = byId.get(item.registrationId)!;
                  return (
                     order.revision !== item.revision ||
                     !allowed.includes(order.status)
                  );
               })
            )
               return { conflict: true } as const;
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

   async getAssignedForms(subEventId: string, packageId: string) {
      const now = new Date();
      return prisma.registrationFormAssignment.findMany({
         where: {
            form: {
               subEventId,
               status: 'PUBLISHED',
               stage: 'REGISTRATION',
            },
            OR: [
               { ticketPackageId: packageId },
               {
                  ticketPackageId: null,
                  form: {
                     assignments: {
                        none: { ticketPackageId: packageId },
                     },
                  },
               },
            ],
            AND: [
               { OR: [{ opensAt: null }, { opensAt: { lte: now } }] },
               { OR: [{ closesAt: null }, { closesAt: { gt: now } }] },
            ],
         },
         orderBy: { orderIndex: 'asc' },
         include: formInclude,
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
               where: { subEventId, buyerUserId: userId, status: 'DRAFT' },
               include: {
                  ...detailInclude,
                  members: {
                     where: { userId, isBuyer: true },
                     include: {
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

               const now = new Date();
               const assignments = await tx.registrationFormAssignment.findMany(
                  {
                     where: {
                        form: {
                           subEventId,
                           status: 'PUBLISHED',
                           stage: 'REGISTRATION',
                        },
                        OR: [
                           { ticketPackageId: existing.ticketPackageId },
                           {
                              ticketPackageId: null,
                              form: {
                                 assignments: {
                                    none: {
                                       ticketPackageId:
                                          existing.ticketPackageId,
                                    },
                                 },
                              },
                           },
                        ],
                        AND: [
                           {
                              OR: [
                                 { opensAt: null },
                                 { opensAt: { lte: now } },
                              ],
                           },
                           {
                              OR: [
                                 { closesAt: null },
                                 { closesAt: { gt: now } },
                              ],
                           },
                        ],
                     },
                     select: {
                        registrationFormId: true,
                        audience: true,
                        isRequired: true,
                        orderIndex: true,
                        form: {
                           select: {
                              questions: {
                                 where: { status: 'ACTIVE' },
                                 select: { fieldType: true },
                              },
                           },
                        },
                     },
                  },
               );
               if (
                  assignments.some((assignment) =>
                     assignment.form.questions.some(
                        (question) => question.fieldType === 'FILE',
                     ),
                  )
               )
                  return {
                     unsupportedCode: 'UNSUPPORTED_FILE_QUESTION',
                  } as const;
               const buyerMemberId = existing.members[0]?.id;
               if (!buyerMemberId) return existing;
               const uniqueAssignments = [
                  ...new Map(
                     assignments.map((assignment) => [
                        `${assignment.registrationFormId}:${assignment.audience}`,
                        assignment,
                     ]),
                  ).values(),
               ];
               if (uniqueAssignments.length > 0)
                  await tx.registrationFormSubmission.createMany({
                     data: uniqueAssignments.map((assignment) => ({
                        registrationFormId: assignment.registrationFormId,
                        registrationOrderId: existing.id,
                        orderMemberId:
                           assignment.audience === 'BUYER'
                              ? null
                              : buyerMemberId,
                        assignmentAudience: assignment.audience,
                        assignmentRequired: assignment.isRequired,
                        assignmentOrderIndex: assignment.orderIndex,
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
            const selectedPackage = await tx.ticketPackage.findFirst({
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
            if (!selectedPackage) return null;
            if (selectedPackage.seatCount !== 1)
               return {
                  unsupportedCode: 'UNSUPPORTED_BUNDLE_PACKAGE',
               } as const;

            const assignments = await tx.registrationFormAssignment.findMany({
               where: {
                  form: {
                     subEventId,
                     status: 'PUBLISHED',
                     stage: 'REGISTRATION',
                  },
                  OR: [
                     { ticketPackageId: selectedPackage.id },
                     {
                        ticketPackageId: null,
                        form: {
                           assignments: {
                              none: { ticketPackageId: selectedPackage.id },
                           },
                        },
                     },
                  ],
                  AND: [
                     { OR: [{ opensAt: null }, { opensAt: { lte: now } }] },
                     { OR: [{ closesAt: null }, { closesAt: { gt: now } }] },
                  ],
               },
               select: {
                  registrationFormId: true,
                  audience: true,
                  isRequired: true,
                  orderIndex: true,
                  form: {
                     select: {
                        questions: {
                           where: { status: 'ACTIVE' },
                           select: { fieldType: true },
                        },
                     },
                  },
               },
            });
            if (
               assignments.some((assignment) =>
                  assignment.form.questions.some(
                     (question) => question.fieldType === 'FILE',
                  ),
               )
            )
               return { unsupportedCode: 'UNSUPPORTED_FILE_QUESTION' } as const;
            const memberId = randomUUID();
            const uniqueAssignments = [
               ...new Map(
                  assignments.map((assignment) => [
                     `${assignment.registrationFormId}:${assignment.audience}`,
                     assignment,
                  ]),
               ).values(),
            ];
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
                     create: uniqueAssignments.map((assignment) => ({
                        registrationFormId: assignment.registrationFormId,
                        assignmentAudience: assignment.audience,
                        assignmentRequired: assignment.isRequired,
                        assignmentOrderIndex: assignment.orderIndex,
                        orderMemberId:
                           assignment.audience === 'BUYER' ? null : memberId,
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
            return created;
         },
         { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
   }

   async listOwned(userId: string, params: RegistrationPagination) {
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
            const scope = await tx.registrationOrder.findFirst({
               where: { id: registrationId, buyerUserId: userId },
               select: { subEventId: true },
            });
            if (!scope) return null;
            await tx.$queryRaw`SELECT "id" FROM "subevents" WHERE "id" = ${scope.subEventId} FOR UPDATE`;
            const order = await tx.registrationOrder.findFirst({
               where: {
                  id: registrationId,
                  OR: [
                     { buyerUserId: userId },
                     { members: { some: { userId } } },
                  ],
                  status: { in: ['DRAFT', 'NEEDS_CORRECTION'] },
               },
               select: {
                  id: true,
                  buyerUserId: true,
                  members: {
                     where: { userId, status: { not: 'CANCELLED' } },
                     select: { id: true, isBuyer: true },
                  },
               },
            });
            if (!order) return null;
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
               },
            });
            if (!order) return null;
            if (!['DRAFT', 'NEEDS_CORRECTION'].includes(order.status))
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
            if (order.ticketPackage.seatCount !== 1)
               return { bundlePackage: true } as const;
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
            const nextStatus = isPaid
               ? 'PENDING_PAYMENT'
               : order.subEvent.approvalMode === 'AUTO_APPROVE'
                 ? 'APPROVED'
                 : 'PENDING_APPROVAL';
            const paymentDeadlineAt = isPaid
               ? new Date(
                    now.getTime() +
                       order.subEvent.paymentDeadlineHours * 60 * 60 * 1000,
                 )
               : null;
            await tx.registrationCapacityHold.upsert({
               where: { id: `submit-${order.id}` },
               create: {
                  id: `submit-${order.id}`,
                  registrationOrderId: order.id,
                  subEventId: order.subEventId,
                  quantity: order.seatCount,
                  status: isPaid ? 'ACTIVE' : 'CONSUMED',
                  expiresAt: paymentDeadlineAt ?? now,
                  consumedAt: isPaid ? null : now,
               },
               update: {
                  status: isPaid ? 'ACTIVE' : 'CONSUMED',
                  expiresAt: paymentDeadlineAt ?? now,
                  consumedAt: isPaid ? null : now,
               },
            });
            if (isPaid) {
               const bankSnapshot = {
                  bankName: order.subEvent.paymentBankName,
                  accountHolder: order.subEvent.paymentAccountHolder,
                  accountNumber: order.subEvent.paymentAccountNumberCanonical,
                  instructions: order.subEvent.paymentInstructions,
               } satisfies Prisma.InputJsonObject;
               if (
                  !bankSnapshot.bankName ||
                  !bankSnapshot.accountHolder ||
                  !bankSnapshot.accountNumber
               )
                  return { packageUnavailable: true } as const;
               await tx.registrationPayment.upsert({
                  where: { registrationOrderId: order.id },
                  create: {
                     registrationOrderId: order.id,
                     status: 'UNPAID',
                     currency: order.currency,
                     amountMinor: order.totalMinor,
                     bankSnapshot,
                     expiresAt: paymentDeadlineAt,
                     history: { create: { toStatus: 'UNPAID' } },
                  },
                  update: {},
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
                  paymentDeadlineAt,
               },
               include: detailInclude,
            });
            if (nextStatus === 'APPROVED')
               await assignPublishedPostRegistrationForms(tx, {
                  orderIds: [order.id],
               });
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
            if (order.status === 'DRAFT') {
               await tx.registrationInvitation.updateMany({
                  where: {
                     orderMember: { registrationOrderId: order.id },
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
}

export const eventRegistrationRepository = new EventRegistrationRepository();
