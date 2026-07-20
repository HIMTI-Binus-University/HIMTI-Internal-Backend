import {
   ManageRegistrationsQuerySchema,
   ManageRegistrationUpdateSchema,
} from './userSchema.js';
import { z } from 'zod';

export type ManageRegistrationsQuery = z.infer<
   typeof ManageRegistrationsQuerySchema
>;
export type ManageRegistrationUpdate = z.infer<
   typeof ManageRegistrationUpdateSchema
>;
