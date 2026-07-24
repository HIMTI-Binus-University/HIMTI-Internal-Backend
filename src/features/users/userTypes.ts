import {
   CompleteProfileSchema,
   GetUserSchema,
   UpdateProfileSchema,
   UpdateUserSchema,
   UserFilterSchema,
} from './userSchema.js';
import { z } from 'zod';

export type GetUserSchema = z.infer<typeof GetUserSchema>;
export type UpdateUserRequest = z.infer<typeof UpdateUserSchema>;
export type CompleteProfileRequest = z.infer<typeof CompleteProfileSchema>;
export type UpdateProfileRequest = z.infer<typeof UpdateProfileSchema>;
export type UserFilters = z.infer<typeof UserFilterSchema>;
