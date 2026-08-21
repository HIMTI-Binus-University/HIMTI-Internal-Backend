import { z } from 'zod';

export const HARD_MAX_PROOF_BYTES = 10 * 1024 * 1024;
export const acceptedProofTypes = [
   'image/jpeg',
   'image/png',
   'image/webp',
   'application/pdf',
] as const;

export const paymentStatusSchema = z.enum([
   'UNPAID',
   'PROOF_SUBMITTED',
   'VERIFIED',
   'REJECTED',
   'EXPIRED',
   'CANCELLED',
]);
export const paymentProofStatusSchema = z.enum([
   'SUBMITTED',
   'ACCEPTED',
   'REJECTED',
   'SUPERSEDED',
]);
export const paymentOrderStatusSchema = z.enum([
   'DRAFT',
   'AWAITING_MEMBERS',
   'HOLDING',
   'SUBMITTED',
   'PENDING_PAYMENT',
   'PAYMENT_REVIEW',
   'PENDING_APPROVAL',
   'APPROVED',
   'NEEDS_CORRECTION',
   'WAITLISTED',
   'REJECTED',
   'EXPIRED',
   'CANCELLED',
]);
export const paymentBankSnapshotSchema = z.object({
   bankName: z.string(),
   accountHolder: z.string(),
   accountNumber: z.string(),
   instructions: z.string().nullable(),
   acceptedProofTypes: z.array(z.enum(acceptedProofTypes)),
   maxProofBytes: z.number().int().positive(),
});
export const paymentHistorySchema = z.object({
   id: z.string(),
   fromStatus: paymentStatusSchema.nullable(),
   toStatus: paymentStatusSchema,
   reason: z.string().nullable(),
   createdAt: z.string().datetime(),
});
export const paymentProofSummarySchema = z.object({
   id: z.string(),
   status: paymentProofStatusSchema,
   submittedAt: z.string().datetime(),
   reviewedAt: z.string().datetime().nullable(),
   reviewReason: z.string().nullable(),
   contentPath: z.string(),
   upload: z.object({
      id: z.string(),
      originalFilename: z.string(),
      mediaType: z.enum(acceptedProofTypes),
      sizeBytes: z.number().int().positive(),
      sha256: z.string().regex(/^[a-f0-9]{64}$/),
   }),
});
export const participantPaymentDetailSchema = z.object({
   id: z.string(),
   registrationOrderId: z.string(),
   orderNumber: z.string(),
   orderStatus: paymentOrderStatusSchema,
   status: paymentStatusSchema,
   revision: z.number().int().positive(),
   currency: z.string().length(3),
   amountMinor: z.string().regex(/^\d+$/),
   bankSnapshot: paymentBankSnapshotSchema,
   submittedAt: z.string().datetime().nullable(),
   verifiedAt: z.string().datetime().nullable(),
   expiresAt: z.string().datetime().nullable(),
   rejectionReason: z.string().nullable(),
   canUploadProof: z.boolean(),
   canReplaceProof: z.boolean(),
   deadlineExpired: z.boolean(),
   proofs: z.array(paymentProofSummarySchema),
   history: z.array(paymentHistorySchema),
});
export const paymentBuyerSchema = z.object({
   id: z.string(),
   name: z.string(),
   email: z.string().email(),
   nim: z.string().nullable(),
});
export const internalPaymentQueueRowSchema = z.object({
   id: z.string(),
   registrationOrderId: z.string(),
   status: paymentStatusSchema,
   revision: z.number().int().positive(),
   currency: z.string().length(3),
   amountMinor: z.string(),
   submittedAt: z.string().datetime().nullable(),
   expiresAt: z.string().datetime().nullable(),
   createdAt: z.string().datetime(),
   order: z.object({
      orderNumber: z.string(),
      status: paymentOrderStatusSchema,
      buyer: paymentBuyerSchema,
   }),
});
export const internalPaymentDetailSchema = internalPaymentQueueRowSchema.extend(
   {
      bankSnapshot: paymentBankSnapshotSchema,
      verifiedAt: z.string().datetime().nullable(),
      rejectionReason: z.string().nullable(),
      reviewedAt: z.string().datetime().nullable(),
      order: z.object({
         eventId: z.string(),
         subEventId: z.string(),
         orderNumber: z.string(),
         status: paymentOrderStatusSchema,
         buyer: paymentBuyerSchema,
      }),
      proofs: z.array(paymentProofSummarySchema),
      history: z.array(paymentHistorySchema),
   },
);
export const paymentReviewResultSchema = z.object({
   paymentId: z.string(),
   proofId: z.string(),
   status: z.enum(['VERIFIED', 'REJECTED']),
   orderStatus: paymentOrderStatusSchema,
   revision: z.number().int().positive(),
});
export const paymentSettingsSchema = z
   .object({
      amountMinor: z.string().regex(/^\d+$/).max(30),
      currency: z
         .string()
         .regex(/^[A-Z]{3}$/)
         .default('IDR'),
      bankName: z.string().trim().min(1).max(100).nullable(),
      accountHolder: z.string().trim().min(1).max(150).nullable(),
      accountNumber: z.string().trim().min(1).max(100).nullable(),
      instructions: z.string().trim().max(5000).nullable().optional(),
      paymentDeadlineHours: z.number().int().min(1).max(720),
      acceptedProofTypes: z.array(z.enum(acceptedProofTypes)).max(4),
      maxProofBytes: z.number().int().min(1).max(HARD_MAX_PROOF_BYTES),
   })
   .strict()
   .superRefine((value, ctx) => {
      if (BigInt(value.amountMinor) === 0n) return;
      for (const field of [
         'bankName',
         'accountHolder',
         'accountNumber',
      ] as const) {
         if (!value[field])
            ctx.addIssue({
               code: 'custom',
               path: [field],
               message: `${field} is required for paid registration`,
            });
      }
      if (value.acceptedProofTypes.length === 0)
         ctx.addIssue({
            code: 'custom',
            path: ['acceptedProofTypes'],
            message:
               'At least one proof type is required for paid registration',
         });
   });

export const paymentSettingsResponseSchema = z.object({
   amountMinor: z.string().regex(/^\d+$/),
   currency: z.string().regex(/^[A-Z]{3}$/),
   bankName: z.string().nullable(),
   accountHolder: z.string().nullable(),
   accountNumber: z.string().nullable(),
   instructions: z.string().nullable(),
   paymentDeadlineHours: z.number().int().min(1).max(720),
   acceptedProofTypes: z.array(z.enum(acceptedProofTypes)).max(4),
   maxProofBytes: z.number().int().min(1).max(HARD_MAX_PROOF_BYTES),
});

export const paymentQueueSchema = z.object({
   page: z.coerce.number().int().min(1).default(1),
   limit: z.coerce.number().int().min(1).max(100).default(20),
   status: paymentStatusSchema.optional(),
   search: z.string().trim().min(1).max(200).optional(),
   sort: z
      .enum([
         'submittedAt:asc',
         'submittedAt:desc',
         'createdAt:asc',
         'createdAt:desc',
         'expiresAt:asc',
         'expiresAt:desc',
      ])
      .default('submittedAt:asc'),
});

export const paymentDecisionSchema = z.object({
   revision: z.number().int().positive(),
   reason: z.string().trim().min(1).max(2000).optional(),
});

export const paymentRejectSchema = paymentDecisionSchema.extend({
   reason: z.string().trim().min(1).max(2000),
});

export const idParamSchema = z.object({ id: z.string().min(1) });
export const subEventParamSchema = z.object({ subEventId: z.string().min(1) });
export const registrationParamSchema = z.object({
   registrationId: z.string().min(1),
});
