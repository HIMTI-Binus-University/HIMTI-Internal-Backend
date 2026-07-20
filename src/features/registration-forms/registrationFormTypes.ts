import { z } from 'zod';
import {
   CreateFormQuestionOptionSchema,
   CreateFormQuestionSchema,
   CreateRegistrationFormSchema,
   DeleteFormQuestionOptionSchema,
   DeleteFormQuestionSchema,
   ReorderFormQuestionsSchema,
   UpdateFormQuestionOptionSchema,
   UpdateFormQuestionSchema,
   UpdateRegistrationFormStatusSchema,
} from './registrationFormSchema.js';

export type CreateRegistrationFormRequest = z.infer<
   typeof CreateRegistrationFormSchema
>;
export type UpdateRegistrationFormStatusRequest = z.infer<
   typeof UpdateRegistrationFormStatusSchema
>;
export type CreateFormQuestionRequest = z.infer<
   typeof CreateFormQuestionSchema
>;
export type ReorderFormQuestionsRequest = z.infer<
   typeof ReorderFormQuestionsSchema
>;
export type UpdateFormQuestionRequest = z.infer<
   typeof UpdateFormQuestionSchema
>;
export type DeleteFormQuestionRequest = z.infer<
   typeof DeleteFormQuestionSchema
>;
export type CreateFormQuestionOptionRequest = z.infer<
   typeof CreateFormQuestionOptionSchema
>;
export type UpdateFormQuestionOptionRequest = z.infer<
   typeof UpdateFormQuestionOptionSchema
>;
export type DeleteFormQuestionOptionRequest = z.infer<
   typeof DeleteFormQuestionOptionSchema
>;
