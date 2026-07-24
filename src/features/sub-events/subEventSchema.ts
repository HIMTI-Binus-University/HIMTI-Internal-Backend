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

const FormFieldTypeEnum = z.enum([
   'TEXT',
   'TEXTAREA',
   'NUMBER',
   'DATE',
   'SELECT',
   'RADIO',
   'CHECKBOX',
   'FILE',
]);
const SubeventTypeEnum = z.enum([
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

const QuestionOptionSchema = z.object({
   label: z.string().min(1, 'Option label is required'),
   value: z.string().min(1, 'Option value is required'),
});

const FormQuestionSchema = z.object({
   label: z.string().min(1, 'Question label is required'),
   fieldType: FormFieldTypeEnum,
   isRequired: z.boolean().default(true),
   helpText: z.string().optional(),
   options: z.array(QuestionOptionSchema).optional(),
});

export const CreateSubEventSchema = z.object({
   eventId: z.string(),
   name: z.string().min(1, 'Sub-event name is required'),
   publicDescription: z.string().optional(),
   privateDescription: z.string().optional(),
   date: z.string().datetime(),
   type: SubeventTypeEnum,
   locationName: z.string().optional(),
   locationUrl: optionalHttpUrlSchema
      .optional()
      .transform((value) => value ?? null),
   posterUrl: optionalHttpUrlSchema
      .optional()
      .transform((value) => value ?? null),
   destinationUrl: optionalHttpUrlSchema
      .optional()
      .transform((value) => value ?? null),
   price: z.number().int().min(0).default(0),

   // Payment Info (Optional, default false)
   paid: z.boolean().default(false),
   paymentAccountBank: z.string().optional(),
   paymentAccountNumber: z.int().optional(),
   paymentAccountName: z.string().optional(),
   priceModifier: z.number().int().optional(),
   paymentDesc: z.string().optional(),

   // Registration Rules
   maxParticipants: z.number().int().optional(),
   maxTicketsPerUser: z.number().int().optional(),
   visibility: z.enum(['PUBLIC', 'INTERNAL', 'INVITE_ONLY']).default('PUBLIC'),

   // Questions
   questions: z.array(FormQuestionSchema).optional(),
});

export const UpdateSubEventSchema = z.object({
   name: z.string().min(1, 'Sub-event name is required').optional(),
   publicDescription: z.string().optional().nullable(),
   privateDescription: z.string().optional().nullable(),
   date: z.string().datetime().optional(),
   type: SubeventTypeEnum.optional(),
   locationName: z.string().optional().nullable(),
   locationUrl: optionalHttpUrlSchema.optional(),
   posterUrl: optionalHttpUrlSchema.optional(),
   destinationUrl: optionalHttpUrlSchema.optional(),
   price: z.number().int().min(0).optional(),
   paid: z.boolean().optional(),
   paymentAccountBank: z.string().optional(),
   paymentAccountNumber: z.int().optional().nullable(),
   paymentAccountName: z.string().optional().nullable(),
   priceModifier: z.number().int().optional().nullable(),
   paymentDesc: z.string().optional(),
   maxParticipants: z.number().int().optional().nullable(),
   maxTicketsPerUser: z.number().int().optional().nullable(),
   isRegistrationOpen: z.boolean().optional(),
   autoAcceptRegistration: z.boolean().optional(),
   visibility: z.enum(['PUBLIC', 'INTERNAL', 'INVITE_ONLY']).optional(),
   status: z.enum(['DRAFT', 'OPEN', 'CLOSED', 'CANCELLED']).optional(),
});

export const DeleteSubEventSchema = z.object({});

export const GetSubEventSchema = z.object({
   page: z.coerce.number().min(1).default(1),
   limit: z.coerce.number().min(1).max(100).default(10),
   search: z.string().optional(),
   sort: z.string().default('date:asc'),
   status: z.enum(['DRAFT', 'OPEN', 'CLOSED', 'CANCELLED']).optional(),
   visibility: z.enum(['PUBLIC', 'INTERNAL', 'INVITE_ONLY']).optional(),
   eventId: z.string().optional(),
});
