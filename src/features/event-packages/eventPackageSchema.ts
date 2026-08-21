import { z } from 'zod';

export const eventPackageStatusSchema = z.enum(['DRAFT', 'ACTIVE', 'INACTIVE']);
export const subEventPackageParamsSchema = z.object({
   subEventId: z.string().trim().min(1).max(100),
});
export const eventPackageParamsSchema = z.object({
   packageId: z.string().trim().min(1).max(100),
});
const eventPackageMutationShape = {
   code: z.string().trim().min(1).max(100),
   name: z.string().trim().min(1).max(255),
   description: z.string().trim().max(10000).nullable().optional(),
   status: eventPackageStatusSchema.default('DRAFT'),
   seatCount: z.number().int().min(1).max(1000),
   currency: z
      .string()
      .trim()
      .length(3)
      .transform((value) => value.toUpperCase()),
   priceMinor: z.string().regex(/^\d+$/),
   salesStartAt: z.string().datetime().nullable().optional(),
   salesEndAt: z.string().datetime().nullable().optional(),
} as const;

export const createEventPackageSchema = z
   .object(eventPackageMutationShape)
   .refine(
      (value) =>
         !value.salesStartAt ||
         !value.salesEndAt ||
         value.salesStartAt < value.salesEndAt,
      {
         message: 'salesEndAt must be after salesStartAt',
         path: ['salesEndAt'],
      },
   );
export const updateEventPackageSchema = z
   .object(eventPackageMutationShape)
   .partial()
   .extend({ revision: z.number().int().positive() })
   .refine(
      (value) =>
         !value.salesStartAt ||
         !value.salesEndAt ||
         value.salesStartAt < value.salesEndAt,
      {
         message: 'salesEndAt must be after salesStartAt',
         path: ['salesEndAt'],
      },
   );

export const eventPackageResponseSchema = z.object({
   id: z.string(),
   eventId: z.string(),
   subEventId: z.string(),
   code: z.string(),
   name: z.string(),
   description: z.string().nullable(),
   status: eventPackageStatusSchema,
   seatCount: z.number().int(),
   currency: z.string(),
   priceMinor: z.string(),
   salesStartAt: z.string().datetime().nullable(),
   salesEndAt: z.string().datetime().nullable(),
   revision: z.number().int(),
   dependentOrderCount: z.number().int(),
   editable: z.boolean(),
   createdAt: z.string().datetime(),
   updatedAt: z.string().datetime().nullable(),
});
