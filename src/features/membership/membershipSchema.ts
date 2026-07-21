import { z } from 'zod';

const periodSummarySchema = z.object({
   id: z.string(),
   label: z.string(),
});

const regionSummarySchema = z
   .object({
      id: z.string(),
      name: z.string(),
      shortName: z.string().nullable(),
   })
   .nullable();

export const MembershipResourceSchema = z.object({
   id: z.string(),
   periodId: z.string(),
   title: z.string(),
   description: z.string(),
   url: z.string().url().nullable(),
   position: z.number().int().nonnegative(),
   region: regionSummarySchema,
});

export const MembershipResourcesSchema = z.object({
   period: periodSummarySchema,
   resources: z.array(MembershipResourceSchema),
});

export const MembershipResourcesResponseSchema = z.object({
   msg: z.literal('success'),
   data: MembershipResourcesSchema,
});

export const MembershipStatusSchema = z.object({
   currentPeriod: periodSummarySchema.nullable(),
   availablePeriod: periodSummarySchema.nullable(),
   activePeriod: periodSummarySchema.nullable(),
});

export const PeriodParamsSchema = z.object({ periodId: z.string().min(1) });
export const ResourceParamsSchema = z.object({ resourceId: z.string().min(1) });

export const CreatePeriodSchema = z
   .object({
      id: z.string().trim().min(1).max(100),
      label: z.string().trim().min(1).max(100),
   })
   .strict();

export const UpdatePeriodSchema = z
   .object({ label: z.string().trim().min(1).max(100) })
   .strict();

export const RegistrationOpenSchema = z
   .object({ open: z.boolean() })
   .strict();

const optionalUrl = z
   .union([z.string().trim().url(), z.literal(''), z.null()])
   .transform((value) => value || null);

export const CreateResourceSchema = z
   .object({
      title: z.string().trim().min(1).max(255),
      description: z.string().trim().min(1).max(4000),
      url: optionalUrl,
      regionId: z.string().trim().min(1).nullable(),
   })
   .strict();

export const UpdateResourceSchema = CreateResourceSchema.partial()
   .strict()
   .refine((value) => Object.keys(value).length > 0, {
      message: 'At least one field is required',
   });

export const ResourceOrderSchema = z
   .object({ resourceIds: z.array(z.string().min(1)) })
   .strict();
