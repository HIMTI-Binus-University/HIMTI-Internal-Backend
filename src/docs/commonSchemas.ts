import '@/docs/zodOpenApi.js';
import { z } from 'zod';

export const protectedEndpoint = {
   bearerAuth: [],
};

export const idParamSchema = z.object({
   id: z.string(),
});

export const errorResponseSchema = z.object({
   status: z.string().optional(),
   success: z.boolean().optional(),
   msg: z.string().optional(),
   message: z.string().optional(),
});

export const validationErrorResponseSchema = z.object({
   errors: z.unknown(),
});

export const successResponseSchema = z.object({
   msg: z.literal('success'),
});

export const paginationMetaSchema = z.object({
   page: z.number(),
   limit: z.number(),
   totalRecords: z.number(),
   totalPages: z.number(),
});

export const statusSchema = z.enum(['ACTIVE', 'INACTIVE']);
export const userStatusSchema = z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']);
export const eventStatusSchema = z.enum([
   'DRAFT',
   'PUBLISHED',
   'CLOSED',
   'CANCELLED',
]);
export const subeventTypeSchema = z.enum([
   'MAIN_EVENT',
   'WORKSHOP',
   'SEMINAR',
   'COMPETITION',
   'WELCOMING_PARTY',
   'DOMESTIC_STUDY_TOUR',
   'INTERNATIONAL_STUDY_TOUR',
   'COMPANY_VISIT',
   'OTHER',
]);
export const subeventVisibilitySchema = z.enum([
   'PUBLIC',
   'INTERNAL',
   'INVITE_ONLY',
]);
export const subeventStatusSchema = z.enum([
   'DRAFT',
   'OPEN',
   'CLOSED',
   'CANCELLED',
]);
export const formFieldTypeSchema = z.enum([
   'TEXT',
   'TEXTAREA',
   'NUMBER',
   'DATE',
   'SELECT',
   'RADIO',
   'CHECKBOX',
   'FILE',
]);
export const formQuestionStatusSchema = z.enum(['ACTIVE', 'INACTIVE']);
export const registrationFormStatusSchema = z.enum([
   'DRAFT',
   'PUBLISHED',
   'CLOSED',
]);

export const relationSummarySchema = z
   .object({
      id: z.string(),
      name: z.string(),
   })
   .nullable();

export const listQuerySchema = z.object({
   page: z.coerce.number().min(1).optional(),
   limit: z.coerce.number().min(1).max(100).optional(),
   search: z.string().optional(),
   sort: z.string().optional(),
   status: statusSchema.optional(),
});
