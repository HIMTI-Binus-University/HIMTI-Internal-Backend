import {
   CompleteProfileSchema,
   UpdateProfileSchema,
} from './registSchema.js';
import { z } from 'zod';

export type CompleteProfileRequest = z.infer<typeof CompleteProfileSchema>;
export type UpdateProfileRequest = z.infer<typeof UpdateProfileSchema>;
