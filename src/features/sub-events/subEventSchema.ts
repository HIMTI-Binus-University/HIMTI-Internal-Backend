import { z } from 'zod';

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
   locationUrl: z.string().url().optional(),
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

   // Questions
   questions: z.array(FormQuestionSchema).optional(),
});
