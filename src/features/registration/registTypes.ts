import {
   CompleteProfileSchema,
   SendVerificationSchema,
} from './registSchema.js';
import { z } from 'zod';

export type CompleteProfileRequest = z.infer<typeof CompleteProfileSchema>;
export type SendVerificationRequest = z.infer<typeof SendVerificationSchema>;
