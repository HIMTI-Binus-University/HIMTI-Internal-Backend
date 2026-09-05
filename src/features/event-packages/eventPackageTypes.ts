import { z } from 'zod';
import {
   CreateEventPackageSchema,
   UpdateEventPackageSchema,
} from './eventPackageSchema.js';

export type CreateEventPackageRequest = z.infer<
   typeof CreateEventPackageSchema
>;
export type UpdateEventPackageRequest = z.infer<
   typeof UpdateEventPackageSchema
>;
