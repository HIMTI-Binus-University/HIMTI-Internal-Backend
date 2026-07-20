import { z } from 'zod';
import {
   CreateFormQuestionOptionSchema,
   CreateFormQuestionSchema,
   DeleteFormQuestionOptionSchema,
   DeleteFormQuestionSchema,
   ReorderFormQuestionsSchema,
   UpdateFormQuestionOptionSchema,
   UpdateFormQuestionSchema,
} from './registrationFormSchema.js';

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
