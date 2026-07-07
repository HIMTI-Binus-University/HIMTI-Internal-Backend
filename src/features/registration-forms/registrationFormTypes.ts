import { z } from 'zod';
import {
   CreateFormQuestionSchema,
   DeleteFormQuestionSchema,
   UpdateFormQuestionSchema,
} from './registrationFormSchema.js';

export type CreateFormQuestionRequest = z.infer<
   typeof CreateFormQuestionSchema
>;
export type UpdateFormQuestionRequest = z.infer<
   typeof UpdateFormQuestionSchema
>;
export type DeleteFormQuestionRequest = z.infer<
   typeof DeleteFormQuestionSchema
>;
