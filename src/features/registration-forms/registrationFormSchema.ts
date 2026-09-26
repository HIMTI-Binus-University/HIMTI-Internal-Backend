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

const FormQuestionOptionSchema = z.object({
   label: z.string().min(1, 'Option label is required'),
   value: z.string().min(1, 'Option value is required'),
});

export const CreateFormQuestionSchema = z.object({
   label: z.string().min(1).max(255),
   fieldType: FormFieldTypeEnum,
   isRequired: z.boolean().default(true),
   helpText: z.string().optional().nullable(),
   orderIndex: z.number().int().min(0).optional(),
   options: z.array(FormQuestionOptionSchema).optional(),
});

export const ReorderFormQuestionsSchema = z.object({
   questionIds: z.array(z.string()).min(1),
});

export const UpdateFormQuestionSchema = z.object({
   label: z.string().min(1).max(255).optional(),
   fieldType: FormFieldTypeEnum.optional(),
   isRequired: z.boolean().optional(),
   helpText: z.string().optional().nullable(),
   orderIndex: z.number().int().min(0).optional(),
   status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});

export const DeleteFormQuestionSchema = z.object({});

export const CreateFormQuestionOptionSchema = z.object({
   label: z.string().min(1).max(255),
   value: z.string().min(1).max(255),
});

export const UpdateFormQuestionOptionSchema = z.object({
   label: z.string().min(1).max(255).optional(),
   value: z.string().min(1).max(255).optional(),
   isActive: z.boolean().optional(),
});

export const DeleteFormQuestionOptionSchema = z.object({});
