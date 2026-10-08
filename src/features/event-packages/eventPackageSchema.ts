import { z } from 'zod';

const salesWindow = {
   salesStartAt: z.coerce.date().nullable().default(null),
   salesEndAt: z.coerce.date().nullable().default(null),
};
const orderedSalesWindow = (value: {
   salesStartAt?: Date | null;
   salesEndAt?: Date | null;
}) =>
   !value.salesStartAt ||
   !value.salesEndAt ||
   value.salesEndAt > value.salesStartAt;

export const CreateEventPackageSchema = z
   .object({
      name: z.string().trim().min(1).max(255),
      description: z.string().trim().min(1).nullable().default(null),
      seatCount: z.number().int().positive(),
      currency: z.string().trim().length(3).toUpperCase().default('IDR'),
      priceMinor: z.coerce.bigint().nonnegative(),
      ...salesWindow,
   })
   .strict()
   .refine(orderedSalesWindow, {
      path: ['salesEndAt'],
      message: 'salesEndAt must be after salesStartAt',
   });
export const UpdateEventPackageSchema = z
   .object({
      name: z.string().trim().min(1).max(255).optional(),
      description: z.string().trim().min(1).nullable().optional(),
      seatCount: z.number().int().positive().optional(),
      currency: z.string().trim().length(3).toUpperCase().optional(),
      priceMinor: z.coerce.bigint().nonnegative().optional(),
      salesStartAt: z.coerce.date().nullable().optional(),
      salesEndAt: z.coerce.date().nullable().optional(),
   })
   .strict()
   .refine(orderedSalesWindow, {
      path: ['salesEndAt'],
      message: 'salesEndAt must be after salesStartAt',
   });
