import type { z } from 'zod';
import type {
   internalPostRegistrationListQuerySchema,
   postRegistrationCorrectionSchema,
   savePostRegistrationResponseSchema,
   submitPostRegistrationResponseSchema,
} from './postRegistrationFormSchema.js';

export type SavePostRegistrationResponse = z.infer<
   typeof savePostRegistrationResponseSchema
>;
export type SubmitPostRegistrationResponse = z.infer<
   typeof submitPostRegistrationResponseSchema
>;
export type InternalPostRegistrationListQuery = z.infer<
   typeof internalPostRegistrationListQuerySchema
>;
export type PostRegistrationCorrection = z.infer<
   typeof postRegistrationCorrectionSchema
>;
