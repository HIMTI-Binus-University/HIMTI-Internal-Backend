import { z } from 'zod';

export const RegistrationAnswerSchema = z
   .object({
      questionId: z.string().min(1),
      value: z.union([
         z.string(),
         z.number().finite(),
         z.array(z.string().min(1)),
         z.null(),
      ]),
   })
   .strict();

export const CreateEventRegistrationSchema = z
   .object({
      ticketPackageId: z.string().min(1),
      seatCount: z.literal(1).default(1),
      answers: z.array(RegistrationAnswerSchema).default([]),
   })
   .strict();

export const CreateEventBundleSchema = z
   .object({
      ticketPackageId: z.string().min(1),
      answers: z.array(RegistrationAnswerSchema).default([]),
   })
   .strict();

export const JoinEventBundleSchema = z
   .object({
      ticketPackageId: z.string().min(1),
      bundleCode: z.string().trim().min(1).max(64),
   })
   .strict();

export const BundleRevisionSchema = z
   .object({ expectedRevision: z.number().int().positive() })
   .strict();

export const RemoveBundleMemberSchema = BundleRevisionSchema.extend({
   reason: z.string().trim().min(1).max(1000),
}).strict();

export const ReplaceRegistrationAnswersSchema = z
   .object({
      expectedRevision: z.number().int().positive(),
      answers: z.array(RegistrationAnswerSchema),
   })
   .strict();

export const CancelEventRegistrationSchema = z
   .object({ expectedRevision: z.number().int().positive() })
   .strict();

export const EventRegistrationListSchema = z.object({
   page: z.coerce.number().int().min(1).default(1),
   limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const InternalEventRegistrationListSchema =
   EventRegistrationListSchema.extend({
      status: z
         .enum([
            'ASSEMBLING',
            'PENDING_PAYMENT',
            'PAYMENT_REVIEW',
            'CONFIRMED',
            'EXPIRED',
            'CANCELLED',
            'REJECTED',
         ])
         .optional(),
      kind: z.enum(['INDIVIDUAL', 'BUNDLE']).optional(),
   });
