import { z } from 'zod';

export const PaymentIdSchema = z.string().trim().min(1).max(100);
export const PaymentRevisionSchema = z
   .object({
      expectedRevision: z.coerce.number().int().positive(),
   })
   .strict();
export const PaymentCorrectionSchema = PaymentRevisionSchema.extend({
   memberIds: z
      .array(PaymentIdSchema)
      .min(1)
      .max(100)
      .refine((ids) => new Set(ids).size === ids.length),
   reason: z.string().trim().min(1).max(2000),
});
export const PaymentRejectSchema = PaymentRevisionSchema.extend({
   reason: z.string().trim().min(1).max(2000),
});
export const PaymentQueueSchema = z
   .object({
      page: z.coerce.number().int().positive().default(1),
      limit: z.coerce.number().int().min(1).max(100).default(20),
      status: z
         .enum([
            'COLLECTING',
            'REVIEW',
            'VERIFIED',
            'REJECTED',
            'EXPIRED',
            'CANCELLED',
         ])
         .optional(),
   })
   .strict();
