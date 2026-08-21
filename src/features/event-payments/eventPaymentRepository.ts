import { Prisma } from '@prisma/client';
import { prisma } from '@/config/prisma.js';
import { assignPublishedPostRegistrationForms } from '@/features/post-registration-forms/postRegistrationFormRepository.js';
import type { PaymentQueue, PaymentSettings } from './eventPaymentTypes.js';

const paymentSelect = {
   id: true,
   registrationOrderId: true,
   status: true,
   revision: true,
   currency: true,
   amountMinor: true,
   bankSnapshot: true,
   submittedAt: true,
   verifiedAt: true,
   expiresAt: true,
   rejectionReason: true,
   reviewedAt: true,
   createdAt: true,
} satisfies Prisma.RegistrationPaymentSelect;

class PaymentLifecycleConflict extends Error {}

class EventPaymentRepository {
   getSubEventScope(subEventId: string) {
      return prisma.subevent.findUnique({
         where: { id: subEventId },
         select: { id: true, eventId: true },
      });
   }

   getSettings(subEventId: string) {
      return prisma.subevent.findUnique({
         where: { id: subEventId },
         select: {
            id: true,
            eventId: true,
            paymentCurrency: true,
            paymentAmountMinor: true,
            paymentBankName: true,
            paymentAccountHolder: true,
            paymentAccountNumberCanonical: true,
            paymentInstructions: true,
            paymentDeadlineHours: true,
            paymentProofTypes: true,
            paymentProofMaxBytes: true,
         },
      });
   }

   updateSettings(subEventId: string, values: PaymentSettings) {
      return prisma.$transaction(async (tx) => {
         const isPaid = BigInt(values.amountMinor) > 0n;
         const scope = await tx.subevent.findUnique({
            where: { id: subEventId },
            select: { eventId: true },
         });
         if (!scope) return null;
         const subEvent = await tx.subevent.update({
            where: { id: subEventId },
            data: {
               paid: isPaid,
               paymentCurrency: values.currency,
               paymentAmountMinor: BigInt(values.amountMinor),
               paymentBankName: isPaid ? values.bankName : null,
               paymentAccountHolder: isPaid ? values.accountHolder : null,
               paymentAccountNumberCanonical: isPaid
                  ? values.accountNumber
                  : null,
               paymentInstructions: isPaid ? values.instructions : null,
               paymentDeadlineHours: values.paymentDeadlineHours,
               paymentProofTypes: values.acceptedProofTypes,
               paymentProofMaxBytes: values.maxProofBytes,
            },
         });
         const existingDefault = await tx.ticketPackage.findUnique({
            where: {
               subEventId_code: { subEventId, code: 'DEFAULT-INDIVIDUAL' },
            },
            select: {
               id: true,
               seatCount: true,
               _count: { select: { orders: true } },
            },
         });
         let packageUpdated = false;
         if (!existingDefault) {
            await tx.ticketPackage.create({
               data: {
                  id: `default-individual-${subEventId}`,
                  eventId: scope.eventId,
                  subEventId,
                  code: 'DEFAULT-INDIVIDUAL',
                  name: 'Individual registration',
                  description: 'Default one-seat registration package',
                  status: 'ACTIVE',
                  seatCount: 1,
                  currency: values.currency,
                  priceMinor: BigInt(values.amountMinor),
               },
            });
            packageUpdated = true;
         } else if (
            existingDefault.seatCount === 1 &&
            existingDefault._count.orders === 0
         ) {
            await tx.ticketPackage.update({
               where: { id: existingDefault.id },
               data: {
                  currency: values.currency,
                  priceMinor: BigInt(values.amountMinor),
               },
            });
            packageUpdated = true;
         }
         return { subEvent, packageUpdated };
      });
   }

   async list(subEventId: string, query: PaymentQueue) {
      const where: Prisma.RegistrationPaymentWhereInput = {
         order: {
            subEventId,
            ...(query.search && {
               OR: [
                  {
                     orderNumber: {
                        contains: query.search,
                        mode: 'insensitive',
                     },
                  },
                  {
                     buyer: {
                        name: { contains: query.search, mode: 'insensitive' },
                     },
                  },
                  {
                     buyer: {
                        email: { contains: query.search, mode: 'insensitive' },
                     },
                  },
                  {
                     buyer: {
                        nim: { contains: query.search, mode: 'insensitive' },
                     },
                  },
               ],
            }),
         },
         ...(query.status && { status: query.status }),
      };
      const [sortField, sortDirection] = query.sort.split(':') as [
         'submittedAt' | 'createdAt' | 'expiresAt',
         'asc' | 'desc',
      ];
      const primaryOrder =
         sortField === 'createdAt'
            ? { createdAt: sortDirection }
            : {
                 [sortField]: { sort: sortDirection, nulls: 'last' as const },
              };
      const [data, total] = await prisma.$transaction([
         prisma.registrationPayment.findMany({
            where,
            select: {
               ...paymentSelect,
               order: {
                  select: {
                     orderNumber: true,
                     status: true,
                     buyer: {
                        select: {
                           id: true,
                           name: true,
                           email: true,
                           nim: true,
                        },
                     },
                  },
               },
            },
            orderBy: [
               primaryOrder,
               { id: sortDirection },
            ] as Prisma.RegistrationPaymentOrderByWithRelationInput[],
            skip: (query.page - 1) * query.limit,
            take: query.limit,
         }),
         prisma.registrationPayment.count({ where }),
      ]);
      return { data, total };
   }

   findForOwner(paymentId: string, userId: string) {
      return prisma.registrationPayment.findFirst({
         where: { id: paymentId, order: { buyerUserId: userId } },
         select: paymentSelect,
      });
   }

   findByRegistrationForOwner(registrationId: string, userId: string) {
      return prisma.registrationPayment.findFirst({
         where: {
            registrationOrderId: registrationId,
            order: { buyerUserId: userId },
         },
         select: {
            ...paymentSelect,
            order: { select: { orderNumber: true, status: true } },
            proofs: {
               orderBy: { submittedAt: 'desc' },
               select: {
                  id: true,
                  status: true,
                  submittedAt: true,
                  reviewedAt: true,
                  reviewReason: true,
                  upload: {
                     select: {
                        id: true,
                        originalFilename: true,
                        mediaType: true,
                        sizeBytes: true,
                        sha256: true,
                     },
                  },
               },
            },
            history: {
               orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
               select: {
                  id: true,
                  fromStatus: true,
                  toStatus: true,
                  reason: true,
                  createdAt: true,
               },
            },
         },
      });
   }

   findDetail(paymentId: string) {
      return prisma.registrationPayment.findUnique({
         where: { id: paymentId },
         select: {
            ...paymentSelect,
            order: {
               select: {
                  eventId: true,
                  subEventId: true,
                  orderNumber: true,
                  status: true,
                  buyer: {
                     select: { id: true, name: true, email: true, nim: true },
                  },
               },
            },
            proofs: {
               orderBy: { submittedAt: 'desc' },
               select: {
                  id: true,
                  status: true,
                  submittedAt: true,
                  reviewedAt: true,
                  reviewReason: true,
                  upload: {
                     select: {
                        id: true,
                        originalFilename: true,
                        mediaType: true,
                        sizeBytes: true,
                        sha256: true,
                     },
                  },
               },
            },
            history: {
               orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
               select: {
                  id: true,
                  fromStatus: true,
                  toStatus: true,
                  reason: true,
                  createdAt: true,
               },
            },
         },
      });
   }

   async createProof(input: {
      paymentId: string;
      ownerUserId: string;
      storageKey: string;
      mediaType: string;
      originalFilename: string;
      sizeBytes: number;
      sha256: string;
   }) {
      try {
         return await prisma.$transaction(async (tx) => {
            const scope = await tx.registrationPayment.findFirst({
               where: {
                  id: input.paymentId,
                  order: { buyerUserId: input.ownerUserId },
               },
               select: {
                  id: true,
                  order: { select: { subEventId: true } },
               },
            });
            if (!scope) return null;
            await tx.$queryRaw`SELECT "id" FROM "subevents" WHERE "id" = ${scope.order.subEventId} FOR UPDATE`;
            const payment = await tx.registrationPayment.findFirst({
               where: {
                  id: input.paymentId,
                  order: {
                     buyerUserId: input.ownerUserId,
                     status: 'PENDING_PAYMENT',
                  },
                  status: { in: ['UNPAID', 'REJECTED'] },
                  expiresAt: { gt: new Date() },
               },
               select: {
                  id: true,
                  status: true,
                  revision: true,
                  registrationOrderId: true,
               },
            });
            if (!payment) return { lifecycleConflict: true } as const;
            const current = await tx.registrationPaymentProof.findFirst({
               where: { paymentId: payment.id, status: 'SUBMITTED' },
               select: { id: true },
            });
            if (current) return { conflict: true } as const;
            const upload = await tx.privateUpload.create({
               data: {
                  storageKey: input.storageKey,
                  purpose: 'PAYMENT_PROOF',
                  ownerUserId: input.ownerUserId,
                  mediaType: input.mediaType,
                  originalFilename: input.originalFilename,
                  sizeBytes: input.sizeBytes,
                  sha256: input.sha256,
                  status: 'AVAILABLE',
                  availableAt: new Date(),
               },
            });
            const proof = await tx.registrationPaymentProof.create({
               data: {
                  paymentId: payment.id,
                  uploadId: upload.id,
                  fileKey: input.storageKey,
               },
            });
            const changedPayment = await tx.registrationPayment.updateMany({
               where: {
                  id: payment.id,
                  revision: payment.revision,
                  status: payment.status,
               },
               data: {
                  status: 'PROOF_SUBMITTED',
                  revision: { increment: 1 },
                  submittedAt: new Date(),
                  rejectionReason: null,
               },
            });
            if (changedPayment.count !== 1)
               throw new PaymentLifecycleConflict();
            const changedOrder = await tx.registrationOrder.updateMany({
               where: {
                  id: payment.registrationOrderId,
                  status: 'PENDING_PAYMENT',
               },
               data: { status: 'PAYMENT_REVIEW', revision: { increment: 1 } },
            });
            if (changedOrder.count !== 1) throw new PaymentLifecycleConflict();
            await tx.registrationPaymentHistory.create({
               data: {
                  paymentId: payment.id,
                  fromStatus: payment.status,
                  toStatus: 'PROOF_SUBMITTED',
                  actorUserId: input.ownerUserId,
               },
            });
            return { upload, proof };
         });
      } catch (error) {
         if (error instanceof PaymentLifecycleConflict)
            return { lifecycleConflict: true } as const;
         throw error;
      }
   }

   getProofFile(proofId: string) {
      return prisma.registrationPaymentProof.findUnique({
         where: { id: proofId },
         select: {
            id: true,
            payment: {
               select: {
                  order: { select: { buyerUserId: true, eventId: true } },
               },
            },
            upload: true,
         },
      });
   }

   hasPermission(userId: string, name: string) {
      return prisma.user.count({
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
      });
   }

   isCommittee(eventId: string, userId: string) {
      return prisma.eventComittee.count({ where: { eventId, userId } });
   }

   review(
      paymentId: string,
      actorUserId: string,
      revision: number,
      action: 'VERIFIED' | 'REJECTED',
      reason?: string,
   ) {
      return prisma
         .$transaction(
            async (tx) => {
               const payment = await tx.registrationPayment.findUnique({
                  where: { id: paymentId },
                  include: {
                     order: {
                        include: {
                           subEvent: { select: { approvalMode: true } },
                        },
                     },
                  },
               });
               if (!payment) return null;
               await tx.$queryRaw`SELECT "id" FROM "subevents" WHERE "id" = ${payment.order.subEventId} FOR UPDATE`;
               if (
                  payment.revision !== revision ||
                  payment.status !== 'PROOF_SUBMITTED' ||
                  payment.order.status !== 'PAYMENT_REVIEW'
               )
                  return { conflict: true } as const;
               const submittedProof =
                  await tx.registrationPaymentProof.findFirst({
                     where: { paymentId, status: 'SUBMITTED' },
                     orderBy: [{ submittedAt: 'desc' }, { id: 'desc' }],
                     select: { id: true },
                  });
               if (!submittedProof) return { conflict: true } as const;
               const now = new Date();
               const nextOrder =
                  action === 'VERIFIED'
                     ? payment.order.subEvent.approvalMode === 'AUTO_APPROVE'
                        ? 'APPROVED'
                        : 'PENDING_APPROVAL'
                     : 'PENDING_PAYMENT';
               const changed = await tx.registrationPayment.updateMany({
                  where: {
                     id: payment.id,
                     revision,
                     status: 'PROOF_SUBMITTED',
                  },
                  data: {
                     status: action,
                     revision: { increment: 1 },
                     reviewedBy: actorUserId,
                     reviewedAt: now,
                     verifiedAt: action === 'VERIFIED' ? now : null,
                     rejectionReason: action === 'REJECTED' ? reason : null,
                  },
               });
               if (changed.count !== 1) throw new PaymentLifecycleConflict();
               const changedProof =
                  await tx.registrationPaymentProof.updateMany({
                     where: {
                        id: submittedProof.id,
                        paymentId,
                        status: 'SUBMITTED',
                     },
                     data: {
                        status: action === 'VERIFIED' ? 'ACCEPTED' : 'REJECTED',
                        reviewedBy: actorUserId,
                        reviewedAt: now,
                        reviewReason: reason,
                     },
                  });
               if (changedProof.count !== 1)
                  throw new PaymentLifecycleConflict();
               await tx.registrationPaymentHistory.create({
                  data: {
                     paymentId,
                     fromStatus: payment.status,
                     toStatus: action,
                     actorUserId,
                     reason,
                  },
               });
               await tx.registrationStatusHistory.create({
                  data: {
                     registrationOrderId: payment.registrationOrderId,
                     entityType: 'ORDER',
                     entityId: payment.registrationOrderId,
                     fromStatus: payment.order.status,
                     toStatus: nextOrder,
                     actorUserId,
                     reason,
                  },
               });
               const changedOrder = await tx.registrationOrder.updateMany({
                  where: {
                     id: payment.registrationOrderId,
                     status: 'PAYMENT_REVIEW',
                  },
                  data: {
                     status: nextOrder,
                     revision: { increment: 1 },
                     approvedAt: nextOrder === 'APPROVED' ? now : undefined,
                  },
               });
               if (changedOrder.count !== 1)
                  throw new PaymentLifecycleConflict();
               if (nextOrder === 'APPROVED')
                  await assignPublishedPostRegistrationForms(tx, {
                     orderIds: [payment.registrationOrderId],
                  });
               return {
                  paymentId,
                  proofId: submittedProof.id,
                  status: action,
                  orderStatus: nextOrder,
                  revision: revision + 1,
               };
            },
            { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
         )
         .catch((error: unknown) => {
            if (error instanceof PaymentLifecycleConflict)
               return { conflict: true } as const;
            throw error;
         });
   }
}

export const eventPaymentRepository = new EventPaymentRepository();
