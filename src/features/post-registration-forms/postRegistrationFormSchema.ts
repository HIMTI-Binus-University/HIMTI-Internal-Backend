import { z } from 'zod';
import { typedAnswerSchema } from '@/features/event-registrations/eventRegistrationSchema.js';

export const postRegistrationParamsSchema = z.object({
   registrationId: z.string().trim().min(1).max(100),
});
export const postRegistrationAssignmentParamsSchema =
   postRegistrationParamsSchema.extend({ assignmentId: z.string().min(1) });
export const postRegistrationSubEventParamsSchema = z.object({
   subEventId: z.string().trim().min(1).max(100),
});
export const savePostRegistrationResponseSchema = z.object({
   revision: z.number().int().positive().nullable(),
   answers: z.array(typedAnswerSchema).max(200),
});
export const submitPostRegistrationResponseSchema = z.object({
   revision: z.number().int().positive(),
});
export const internalPostRegistrationListQuerySchema = z.object({
   page: z.coerce.number().int().min(1).default(1),
   limit: z.coerce.number().int().min(1).max(100).default(20),
   search: z.string().trim().max(255).optional(),
   status: z
      .enum(['NOT_STARTED', 'DRAFT', 'LOCKED', 'NEEDS_CORRECTION'])
      .optional(),
   required: z.coerce.boolean().optional(),
   blocksCheckIn: z.coerce.boolean().optional(),
});
export const postRegistrationCorrectionSchema = z.object({
   revision: z.number().int().positive(),
   reason: z.string().trim().min(1).max(1000),
   deadlineAt: z.iso.datetime(),
});
export const postRegistrationReopenSchema = postRegistrationCorrectionSchema;
export const postRegistrationIdempotencyKeySchema = z
   .string()
   .trim()
   .min(8)
   .max(255);

const answerSchema = z.object({
   questionId: z.string(),
   type: z.string(),
   value: z.union([z.string(), z.array(z.string()), z.null()]),
   selectedOptions: z.array(
      z.object({ id: z.string(), label: z.string(), value: z.string() }),
   ),
});
const optionSchema = z.object({
   id: z.string(),
   label: z.string(),
   value: z.string(),
   orderIndex: z.number().int(),
});
const questionSchema = z.object({
   id: z.string(),
   label: z.string(),
   fieldKey: z.string(),
   fieldType: z.string(),
   isRequired: z.boolean(),
   helpText: z.string().nullable(),
   validation: z.record(z.string(), z.unknown()),
   orderIndex: z.number().int(),
   options: z.array(optionSchema),
});
const sectionSchema = z.object({
   id: z.string(),
   title: z.string(),
   description: z.string().nullable(),
   orderIndex: z.number().int(),
   questions: z.array(questionSchema),
});
export const postRegistrationAssignmentResponseSchema = z.object({
   id: z.string(),
   registrationId: z.string(),
   formId: z.string(),
   logicalFormKey: z.string(),
   formName: z.string(),
   formDescription: z.string().nullable(),
   version: z.number().int(),
   memberId: z.string().nullable(),
   participant: z.object({
      id: z.string(),
      name: z.string(),
      email: z.string().email(),
   }),
   audience: z.enum(['BUYER', 'EACH_ATTENDEE', 'ALL_ORDER_MEMBERS']),
   isRequired: z.boolean(),
   blocksCheckIn: z.boolean(),
   orderIndex: z.number().int(),
   opensAt: z.string().datetime().nullable(),
   closesAt: z.string().datetime().nullable(),
   assignedAt: z.string().datetime(),
   correctionReason: z.string().nullable(),
   correctionDeadlineAt: z.string().datetime().nullable(),
   reopenReason: z.string().nullable(),
   reopenDeadlineAt: z.string().datetime().nullable(),
   availability: z.enum([
      'UPCOMING',
      'OPEN',
      'OVERDUE',
      'COMPLETED',
      'CORRECTION',
   ]),
   completion: z.enum(['NOT_STARTED', 'DRAFT', 'LOCKED', 'NEEDS_CORRECTION']),
   canEdit: z.boolean(),
   canSubmit: z.boolean(),
   response: z
      .object({
         id: z.string(),
         status: z.string(),
         revision: z.number().int(),
         answers: z.array(answerSchema),
      })
      .nullable(),
   sections: z.array(sectionSchema),
});
export const postRegistrationListResponseSchema = z.object({
   msg: z.literal('success'),
   data: z.array(postRegistrationAssignmentResponseSchema),
});
export const postRegistrationDetailResponseSchema = z.object({
   msg: z.literal('success'),
   data: postRegistrationAssignmentResponseSchema,
});
export const internalPostRegistrationListResponseSchema = z.object({
   msg: z.literal('success'),
   data: z.array(postRegistrationAssignmentResponseSchema),
   summary: z.object({
      total: z.number().int(),
      completed: z.number().int(),
      overdue: z.number().int(),
      requiredIncomplete: z.number().int(),
      blockingIncomplete: z.number().int(),
   }),
   meta: z.object({
      page: z.number().int(),
      limit: z.number().int(),
      totalRecords: z.number().int(),
      totalPages: z.number().int(),
   }),
});
