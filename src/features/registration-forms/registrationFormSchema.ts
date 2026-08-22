import { z } from 'zod';
import { getRegexValidationError } from '@/utils/safeRegex.js';

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

export const FormValidationSchema = z
   .object({
      minLength: z.number().int().min(0).optional(),
      maxLength: z.number().int().positive().optional(),
      min: z.number().optional(),
      max: z.number().optional(),
      minSelections: z.number().int().min(0).optional(),
      maxSelections: z.number().int().positive().optional(),
      allowedFileTypes: z.array(z.string().trim().min(1)).max(25).optional(),
      maxFileSizeMb: z.number().positive().max(100).optional(),
      maxFiles: z.number().int().positive().max(20).optional(),
      minDate: z.iso.date().optional(),
      maxDate: z.iso.date().optional(),
      pattern: z.string().min(1).max(256).optional(),
      patternMessage: z.string().min(1).max(200).optional(),
   })
   .strict()
   .superRefine((value, ctx) => {
      if (
         value.minLength !== undefined &&
         value.maxLength !== undefined &&
         value.minLength > value.maxLength
      )
         ctx.addIssue({
            code: 'custom',
            path: ['minLength'],
            message: 'minLength must not exceed maxLength',
         });
      if (
         value.min !== undefined &&
         value.max !== undefined &&
         value.min > value.max
      )
         ctx.addIssue({
            code: 'custom',
            path: ['min'],
            message: 'min must not exceed max',
         });
      if (
         value.minSelections !== undefined &&
         value.maxSelections !== undefined &&
         value.minSelections > value.maxSelections
      )
         ctx.addIssue({
            code: 'custom',
            path: ['minSelections'],
            message: 'minSelections must not exceed maxSelections',
         });
      if (
         value.minDate !== undefined &&
         value.maxDate !== undefined &&
         value.minDate > value.maxDate
      )
         ctx.addIssue({
            code: 'custom',
            path: ['minDate'],
            message: 'minDate must not exceed maxDate',
         });
      if (value.patternMessage && !value.pattern)
         ctx.addIssue({
            code: 'custom',
            path: ['patternMessage'],
            message: 'patternMessage requires pattern',
         });
      if (value.pattern) {
         const error = getRegexValidationError(value.pattern);
         if (error)
            ctx.addIssue({ code: 'custom', path: ['pattern'], message: error });
      }
   });

const DraftOptionSchema = z.object({
   id: z.string().optional(),
   label: z.string().trim().min(1).max(255),
   value: z.string().trim().min(1).max(255),
});

const DraftQuestionSchema = z.object({
   id: z.string().optional(),
   label: z.string().trim().min(1).max(255),
   fieldKey: z
      .string()
      .trim()
      .regex(/^[a-z][a-z0-9_]*$/)
      .max(100)
      .optional(),
   fieldType: FormFieldTypeEnum,
   isRequired: z.boolean().default(true),
   helpText: z.string().trim().max(2000).nullable().optional(),
   validation: FormValidationSchema.default({}),
   options: z.array(DraftOptionSchema).max(100).default([]),
});

const DraftSectionSchema = z.object({
   id: z.string().optional(),
   clientKey: z.string().trim().min(1).max(100).optional(),
   title: z.string().trim().min(1).max(255),
   description: z.string().trim().max(2000).nullable().optional(),
   questions: z.array(DraftQuestionSchema).max(200).default([]),
});

export const CreateRegistrationFormV1Schema = z.object({
   subEventId: z.string().min(1),
   name: z.string().trim().min(1).max(255),
   description: z.string().trim().max(5000).nullable().optional(),
   stage: z.enum(['REGISTRATION', 'POST_REGISTRATION']).default('REGISTRATION'),
   assignments: z
      .array(
         z.object({
            ticketPackageId: z.string().min(1).nullable().default(null),
            audience: z.enum(['BUYER', 'EACH_ATTENDEE', 'ALL_ORDER_MEMBERS']),
            isRequired: z.boolean().default(true),
            blocksCheckIn: z.boolean().default(false),
            orderIndex: z.number().int().min(0).default(0),
            opensAt: z.iso.datetime().nullable().default(null),
            closesAt: z.iso.datetime().nullable().default(null),
         }),
      )
      .min(1)
      .default([
         {
            ticketPackageId: null,
            audience: 'EACH_ATTENDEE',
            isRequired: true,
            blocksCheckIn: false,
            orderIndex: 0,
            opensAt: null,
            closesAt: null,
         },
      ]),
});

export const SaveRegistrationFormDraftV1Schema = z.object({
   revision: z.number().int().positive(),
   name: z.string().trim().min(1).max(255),
   description: z.string().trim().max(5000).nullable().optional(),
   stage: z.enum(['REGISTRATION', 'POST_REGISTRATION']),
   assignments: CreateRegistrationFormV1Schema.shape.assignments,
   sections: z.array(DraftSectionSchema).min(1).max(50),
});

export const CloneRegistrationFormV1Schema = z.object({
   name: z.string().trim().min(1).max(255).optional(),
});

export const RegistrationFormLifecycleV1Schema = z.object({
   revision: z.number().int().positive(),
});

export const DeleteRegistrationFormV1Schema = RegistrationFormLifecycleV1Schema;

export const RegistrationFormIdParamsSchema = z.object({
   id: z.string().min(1),
});
export const PublishedRegistrationFormParamsSchema = z.object({
   subEventId: z.string().min(1),
   logicalKey: z.string().min(1).max(100),
});
export const RegistrationFormListQuerySchema = z.object({
   subEventId: z.string().min(1),
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
