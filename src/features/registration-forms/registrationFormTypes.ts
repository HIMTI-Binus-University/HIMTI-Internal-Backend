import { z } from 'zod';
import {
   CreateFormQuestionOptionSchema,
   CreateFormQuestionSchema,
   DeleteFormQuestionOptionSchema,
   DeleteFormQuestionSchema,
   ReorderFormQuestionsSchema,
   UpdateFormQuestionOptionSchema,
   UpdateFormQuestionSchema,
   CloneRegistrationFormV1Schema,
   CreateRegistrationFormV1Schema,
   SaveRegistrationFormDraftV1Schema,
   RegistrationFormLifecycleV1Schema,
   DeleteRegistrationFormV1Schema,
} from './registrationFormSchema.js';

export type CreateRegistrationFormV1Request = z.infer<
   typeof CreateRegistrationFormV1Schema
>;
export type SaveRegistrationFormDraftV1Request = z.infer<
   typeof SaveRegistrationFormDraftV1Schema
>;
export type CloneRegistrationFormV1Request = z.infer<
   typeof CloneRegistrationFormV1Schema
>;
export type RegistrationFormLifecycleV1Request = z.infer<
   typeof RegistrationFormLifecycleV1Schema
>;
export type DeleteRegistrationFormV1Request = z.infer<
   typeof DeleteRegistrationFormV1Schema
>;

export type FormValidationIssue = {
   code: string;
   path: string;
   message: string;
};

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
