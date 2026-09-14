import { Prisma } from '@prisma/client';
import { prisma } from '@/config/prisma.js';
import { AppError } from '@/utils/appError.js';
import { createStoredTicketCredential } from '@/features/event-tickets/eventTicketTypes.js';
import {
   acknowledgementsComplete,
   paymentDeadline,
   type PaymentFile,
   type PaymentMutation,
} from './eventPaymentTypes.js';

const include = {
   order: {
      include: {
         event: {
            select: {
               id: true,
               name: true,
               startsAt: true,
               registrationClosesAt: true,
               paymentProofTypes: true,
            },
         },
         ticketPackage: { select: { name: true, salesEndAt: true } },
         capacityHold: true,
         members: {
            select: {
               id: true,
               userId: true,
               status: true,
               snapshotName: true,
               snapshotEmail: true,
            },
         },
      },
   },
   proofs: {
      include: { upload: true },
      orderBy: { submittedAt: 'desc' as const },
   },
   correctionTargets: { orderBy: { requestedAt: 'desc' as const } },
} satisfies Prisma.RegistrationPaymentInclude;

export type PaymentRecord = Prisma.RegistrationPaymentGetPayload<{
   include: typeof include;
}>;

export class EventPaymentRepository {
   get(id: string) {
      return prisma.registrationPayment.findUnique({ where: { id }, include });
   }
   getForInternalRegistration(registrationOrderId: string) {
      return prisma.registrationPayment.findUnique({
         where: { registrationOrderId },
         include,
      });
   }
   forRegistration(registrationOrderId: string, userId: string) {
      return prisma.registrationPayment.findFirst({
         where: {
            registrationOrderId,
            order: {
               members: {
                  some: {
                     userId,
                     OR: [{ status: 'LOCKED' }, { snapshotAt: { not: null } }],
                  },
               },
            },
         },
         include,
      });
   }
   async queue(
      eventId: string,
      query: {
         page: number;
         limit: number;
         status?: Prisma.EnumRegistrationPaymentStatusFilter['equals'];
      },
   ) {
      const where: Prisma.RegistrationPaymentWhereInput = {
         order: { eventId },
         status: query.status,
      };
      const [data, totalRecords] = await prisma.$transaction([
         prisma.registrationPayment.findMany({
            where,
            include,
            orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
            skip: (query.page - 1) * query.limit,
            take: query.limit,
         }),
         prisma.registrationPayment.count({ where }),
      ]);
      return {
         data,
         meta: {
            page: query.page,
            limit: query.limit,
            totalRecords,
            totalPages: Math.ceil(totalRecords / query.limit),
         },
      };
   }
   proof(id: string) {
      return prisma.registrationPaymentProof.findUnique({
         where: { id },
         include: {
            upload: true,
            orderMember: { select: { userId: true } },
            payment: { select: { order: { select: { eventId: true } } } },
         },
      });
   }
   hasPermission(userId: string, name: string) {
      return prisma.user.findFirst({
         where: {
            id: userId,
            status: 'ACTIVE',
            userHasRoles: {
               some: {
                  role: {
                     status: 'ACTIVE',
                     roleHasPermissions: {
                        some: { permission: { name, status: 'ACTIVE' } },
                     },
                  },
               },
            },
         },
         select: { id: true },
      });
   }
   async mutate(
      id: string,
      actorUserId: string | null,
      action: 'upload' | 'approve' | 'request-correction' | 'reject' | 'expire',
      body?: PaymentMutation,
      file?: PaymentFile,
      admin = false,
   ) {
      for (let attempt = 0; ; attempt++) {
         try {
            return await prisma.$transaction(
               async (tx) => {
                  const scope = await tx.registrationPayment.findUnique({
                     where: { id },
                     select: {
                        registrationOrderId: true,
                        order: { select: { eventId: true } },
                     },
                  });
                  if (!scope) throw new AppError('Payment not found', 404);
                  await tx.$queryRaw`SELECT id FROM events WHERE id = ${scope.order.eventId} FOR UPDATE`;
                  await tx.$queryRaw`SELECT id FROM registration_orders WHERE id = ${scope.registrationOrderId} FOR UPDATE`;
                  await tx.$queryRaw`SELECT id FROM registration_payments WHERE id = ${id} FOR UPDATE`;
                  const payment =
                     await tx.registrationPayment.findUniqueOrThrow({
                        where: { id },
                        include,
                     });
                  const order = payment.order;
                  if (
                     ['approve', 'request-correction', 'reject'].includes(
                        action,
                     )
                  ) {
                     const authorized =
                        actorUserId &&
                        (await tx.user.findFirst({
                           where: {
                              id: actorUserId,
                              status: 'ACTIVE',
                              userHasRoles: {
                                 some: {
                                    role: {
                                       status: 'ACTIVE',
                                       roleHasPermissions: {
                                          some: {
                                             permission: {
                                                name: 'review_event_payments',
                                                status: 'ACTIVE',
                                             },
                                          },
                                       },
                                    },
                                 },
                              },
                           },
                           select: { id: true },
                        }));
                     const scoped =
                        admin ||
                        (actorUserId &&
                           (await tx.event.findFirst({
                              where: {
                                 id: order.eventId,
                                 OR: [
                                    {
                                       organizers: {
                                          some: { userId: actorUserId },
                                       },
                                    },
                                    {
                                       eventGroup: {
                                          organizers: {
                                             some: { userId: actorUserId },
                                          },
                                       },
                                    },
                                 ],
                              },
                              select: { id: true },
                           })));
                     if (!authorized || !scoped)
                        throw new AppError(
                           'Payment review permission and event scope required',
                           403,
                        );
                  }
                  const members = order.members.filter(
                     (member) => member.status === 'LOCKED',
                  );
                  const member = members.find(
                     (member) => member.userId === actorUserId,
                  );
                  if (action === 'upload' && !member)
                     throw new AppError('Payment not found', 404);
                  const now = new Date();
                  const deadlines = [
                     payment.expiresAt,
                     order.paymentDeadlineAt,
                     order.capacityHold?.expiresAt,
                     order.event.startsAt,
                     order.event.registrationClosesAt,
                     order.ticketPackage.salesEndAt,
                     ...payment.correctionTargets
                        .filter((target) => !target.resolvedAt)
                        .map((target) => target.deadlineAt),
                  ];
                  const expired = deadlines.some((date) => date && date <= now);
                  const payable =
                     ['COLLECTING', 'REVIEW'].includes(payment.status) &&
                     ['PENDING_PAYMENT', 'PAYMENT_REVIEW'].includes(
                        order.status,
                     );
                  if (action === 'expire' && (!payable || !expired))
                     return 'UNCHANGED';
                  if (!payable) {
                     if (
                        action === 'approve' &&
                        payment.status === 'VERIFIED' &&
                        order.status === 'CONFIRMED'
                     )
                        return 'UNCHANGED';
                     throw new AppError('Payment is no longer open', 409);
                  }
                  // Expiry commits before the caller returns a conflict, so capacity is never retained by a failed request.
                  if (expired || action === 'reject') {
                     if (!expired && order.revision !== body?.expectedRevision)
                        throw new AppError(
                           'Payment changed. Reload before reviewing.',
                           409,
                        );
                     const status = expired ? 'EXPIRED' : 'REJECTED';
                     await tx.registrationPayment.update({
                        where: { id },
                        data: { status, reviewedAt: now },
                     });
                     await tx.registrationCapacityHold.updateMany({
                        where: {
                           registrationOrderId: order.id,
                           status: 'ACTIVE',
                        },
                        data: {
                           status: expired ? 'EXPIRED' : 'RELEASED',
                           releasedAt: now,
                        },
                     });
                     await tx.registrationOrderMember.updateMany({
                        where: {
                           registrationOrderId: order.id,
                           status: { in: ['ACTIVE', 'LOCKED'] },
                        },
                        data: { status: 'LEFT' },
                     });
                     await tx.registrationOrder.update({
                        where: { id: order.id },
                        data: { status, revision: { increment: 1 } },
                     });
                     await tx.registrationStatusHistory.create({
                        data: {
                           registrationOrderId: order.id,
                           actorUserId,
                           entityType: 'PAYMENT',
                           entityId: id,
                           fromStatus: payment.status,
                           toStatus: status,
                           reason: expired
                              ? 'Payment deadline expired'
                              : body?.reason,
                        },
                     });
                     return status;
                  }
                  if (
                     !order.capacityHold ||
                     order.capacityHold.status !== 'ACTIVE' ||
                     order.capacityHold.quantity !== order.seatCount
                  )
                     throw new AppError('Active capacity hold required', 409);
                  if (action === 'upload' && file && member) {
                     const duplicate = payment.proofs.find(
                        (proof) => proof.uploadId === file.id,
                     );
                     if (duplicate) {
                        if (
                           duplicate.upload.sha256 !== file.sha256 ||
                           duplicate.uploadedByUserId !== actorUserId
                        )
                           throw new AppError(
                              'Idempotency key already used',
                              409,
                           );
                        return 'UNCHANGED';
                     }
                  }
                  if (order.revision !== body?.expectedRevision)
                     throw new AppError(
                        'Payment changed. Reload before continuing.',
                        409,
                     );
                  let status: 'COLLECTING' | 'REVIEW' | 'VERIFIED' =
                     payment.status as 'COLLECTING' | 'REVIEW';
                  if (action === 'upload' && file && member) {
                     if (
                        !order.event.paymentProofTypes.includes(file.mediaType)
                     )
                        throw new AppError(
                           'File type is not allowed for this event',
                           400,
                        );
                     await tx.registrationPaymentProof.updateMany({
                        where: {
                           paymentId: id,
                           orderMemberId: member.id,
                           status: 'CURRENT',
                        },
                        data: { status: 'SUPERSEDED', supersededAt: now },
                     });
                     await tx.privateUpload.create({
                        data: {
                           ...file,
                           ownerUserId: actorUserId!,
                           purpose: 'PAYMENT_PROOF',
                           status: 'AVAILABLE',
                           availableAt: now,
                        },
                     });
                     await tx.registrationPaymentProof.create({
                        data: {
                           paymentId: id,
                           orderMemberId: member.id,
                           uploadedByUserId: actorUserId!,
                           uploadId: file.id,
                        },
                     });
                     await tx.paymentCorrectionTarget.updateMany({
                        where: {
                           paymentId: id,
                           orderMemberId: member.id,
                           resolvedAt: null,
                        },
                        data: { resolvedAt: now },
                     });
                     const proofs = await tx.registrationPaymentProof.findMany({
                        where: {
                           paymentId: id,
                           status: 'CURRENT',
                           upload: {
                              status: 'AVAILABLE',
                              purpose: 'PAYMENT_PROOF',
                           },
                        },
                     });
                     const targets = await tx.paymentCorrectionTarget.findMany({
                        where: { paymentId: id, resolvedAt: null },
                     });
                     status = acknowledgementsComplete(
                        members.map((m) => m.id),
                        proofs,
                        targets,
                        order.seatCount,
                     )
                        ? 'REVIEW'
                        : 'COLLECTING';
                  } else if (action === 'request-correction') {
                     if (
                        payment.status !== 'REVIEW' ||
                        !body?.memberIds?.length ||
                        body.memberIds.some(
                           (id) => !members.some((member) => member.id === id),
                        )
                     )
                        throw new AppError(
                           'Select current members of a payment in review',
                           409,
                        );
                     const deadlineAt = paymentDeadline(now, deadlines);
                     await tx.paymentCorrectionTarget.createMany({
                        data: body.memberIds.map((orderMemberId) => ({
                           paymentId: id,
                           orderMemberId,
                           requestedByUserId: actorUserId!,
                           reason: body.reason!,
                           deadlineAt,
                        })),
                     });
                     status = 'COLLECTING';
                  } else if (action === 'approve') {
                     if (
                        payment.status !== 'REVIEW' ||
                        !acknowledgementsComplete(
                           members.map((m) => m.id),
                           payment.proofs.filter(
                              (proof) =>
                                 proof.upload.status === 'AVAILABLE' &&
                                 proof.upload.purpose === 'PAYMENT_PROOF' &&
                                 proof.upload.ownerUserId ===
                                    proof.uploadedByUserId &&
                                 members.some(
                                    (member) =>
                                       member.id === proof.orderMemberId &&
                                       member.userId === proof.uploadedByUserId,
                                 ),
                           ),
                           payment.correctionTargets,
                           order.seatCount,
                        )
                     )
                        throw new AppError(
                           'All member acknowledgements are required',
                           409,
                        );
                     await tx.registrationCapacityHold.update({
                        where: { registrationOrderId: order.id },
                        data: { status: 'CONSUMED', consumedAt: now },
                     });
                     await tx.registrationTicket.createMany({
                        data: members.map((member) => ({
                           eventId: order.eventId,
                           orderMemberId: member.id,
                           ...createStoredTicketCredential(),
                        })),
                     });
                     status = 'VERIFIED';
                  }
                  await tx.registrationPayment.update({
                     where: { id },
                     data: {
                        status,
                        ...(status === 'VERIFIED' && { reviewedAt: now }),
                     },
                  });
                  await tx.registrationOrder.update({
                     where: { id: order.id },
                     data: {
                        status:
                           status === 'VERIFIED'
                              ? 'CONFIRMED'
                              : status === 'REVIEW'
                                ? 'PAYMENT_REVIEW'
                                : 'PENDING_PAYMENT',
                        revision: { increment: 1 },
                        ...(status === 'VERIFIED' && { confirmedAt: now }),
                     },
                  });
                  await tx.registrationStatusHistory.create({
                     data: {
                        registrationOrderId: order.id,
                        actorUserId,
                        entityType: 'PAYMENT',
                        entityId: id,
                        fromStatus: payment.status,
                        toStatus: status,
                        reason:
                           body?.reason ??
                           (action === 'upload'
                              ? 'Member acknowledgement submitted'
                              : 'Payment approved'),
                     },
                  });
                  return 'UPDATED';
               },
               {
                  isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
               },
            );
         } catch (error) {
            if (
               error instanceof Prisma.PrismaClientKnownRequestError &&
               (error.code === 'P2034' ||
                  (error.code === 'P2010' &&
                     ['40001', '40P01'].includes(String(error.meta?.code)))) &&
               attempt < 3
            )
               continue;
            throw error;
         }
      }
   }
   async expiryCandidates() {
      const now = new Date();
      return prisma.registrationPayment.findMany({
         where: {
            status: { in: ['COLLECTING', 'REVIEW'] },
            OR: [
               { expiresAt: { lte: now } },
               {
                  correctionTargets: {
                     some: { resolvedAt: null, deadlineAt: { lte: now } },
                  },
               },
               {
                  order: {
                     OR: [
                        { paymentDeadlineAt: { lte: now } },
                        { capacityHold: { expiresAt: { lte: now } } },
                        { event: { startsAt: { lte: now } } },
                        { event: { registrationClosesAt: { lte: now } } },
                        { ticketPackage: { salesEndAt: { lte: now } } },
                     ],
                  },
               },
            ],
         },
         select: { id: true },
         orderBy: { id: 'asc' },
         take: 100,
      });
   }
   storedUpload(id: string) {
      return prisma.privateUpload.findUnique({
         where: { id },
         select: { storageKey: true },
      });
   }
}

export const eventPaymentRepository = new EventPaymentRepository();
