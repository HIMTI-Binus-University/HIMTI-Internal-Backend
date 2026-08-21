import type { z } from 'zod';
import type { auth } from '@/utils/auth.js';
import type {
   createEventPackageSchema,
   updateEventPackageSchema,
} from './eventPackageSchema.js';

export type SessionUser = typeof auth.$Infer.Session.user;
export type CreateEventPackageRequest = z.infer<
   typeof createEventPackageSchema
>;
export type UpdateEventPackageRequest = z.infer<
   typeof updateEventPackageSchema
>;
