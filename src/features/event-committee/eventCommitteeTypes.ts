import { z } from 'zod';
import {
   AssignEventCommitteeSchema,
   RemoveEventCommitteeSchema,
   UpdateEventCommitteeSchema,
} from './eventCommitteeSchema.js';

export type AssignEventCommitteeRequest = z.infer<
   typeof AssignEventCommitteeSchema
>;
export type UpdateEventCommitteeRequest = z.infer<
   typeof UpdateEventCommitteeSchema
>;
export type RemoveEventCommitteeRequest = z.infer<
   typeof RemoveEventCommitteeSchema
>;
