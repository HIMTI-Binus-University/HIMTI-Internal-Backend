import { z } from 'zod';
import { normalizeHttpUrl } from '@/utils/httpUrl.js';

const optionalHttpUrlSchema = z
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
   });

export const CreateEventSchema = z.object({
   name: z.string(),
   publicDescription: z.string(),
   coverImageUrl: optionalHttpUrlSchema
      .optional()
      .transform((value) => value ?? null),
   status: z.enum(['DRAFT', 'PUBLISHED', 'CLOSED', 'CANCELLED']).optional(),
});

export const UpdateEventSchema = z.object({
   name: z.string().min(1).optional(),
   publicDescription: z.string().optional().nullable(),
   coverImageUrl: optionalHttpUrlSchema.optional(),
   status: z.enum(['DRAFT', 'PUBLISHED', 'CLOSED', 'CANCELLED']).optional(),
});

export const SubEventOrderSchema = z
   .object({ subEventIds: z.array(z.string().min(1)) })
   .strict();

export const DeleteEventSchema = z.object({});

export const GetEventSchema = z.object({
   page: z.coerce.number().min(1).default(1),
   limit: z.coerce.number().min(1).max(100).default(10),
   search: z.string().optional(),
   sort: z.string().default('createdAt:desc'),
   status: z.enum(['DRAFT', 'PUBLISHED', 'CLOSED', 'CANCELLED']).optional(),
   visibility: z.enum(['PUBLIC', 'INTERNAL', 'INVITE_ONLY']).optional(),
});
