import { z } from 'zod';
import { isHttpUrl, normalizeHttpUrl } from '@/utils/httpUrl.js';

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
   url: z
      .string()
      .url()
      .refine(isHttpUrl, 'Only HTTP and HTTPS URLs are allowed')
      .nullable(),
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

export const RegistrationOpenSchema = z.object({ open: z.boolean() }).strict();

const resourceUrlSchema = z
   .string()
   .nullable()
   .transform((value, context) => {
      if (value === null || value.trim() === '') return null;

      try {
         return normalizeHttpUrl(value);
      } catch {
         context.addIssue({
            code: 'custom',
            message:
               'Enter a valid web link. Only HTTP and HTTPS links are allowed.',
         });
         return z.NEVER;
      }
   })
   .describe(
      'Optional HTTP(S) link. A missing scheme defaults to HTTPS; empty values are stored as null.',
   );

const resourceFields = {
   title: z.string().trim().min(1).max(255),
   description: z.string().trim().min(1).max(4000),
   regionId: z.string().trim().min(1).nullable(),
};

export const CreateResourceSchema = z
   .object({
      ...resourceFields,
      url: resourceUrlSchema.optional().transform((value) => value ?? null),
   })
   .strict();

export const UpdateResourceSchema = z
   .object({
      title: resourceFields.title.optional(),
      description: resourceFields.description.optional(),
      url: resourceUrlSchema.optional(),
      regionId: resourceFields.regionId.optional(),
   })
   .strict()
   .refine((value) => Object.keys(value).length > 0, {
      message: 'At least one field is required',
   });

export const ResourceOrderSchema = z
   .object({ resourceIds: z.array(z.string().min(1)) })
   .strict();
