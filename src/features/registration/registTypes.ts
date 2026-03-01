import { CompleteProfileSchema } from './registSchema.js';
import { z } from 'zod';

export type CompleteProfileRequest = z.infer<typeof CompleteProfileSchema>;
