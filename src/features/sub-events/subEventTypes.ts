import { z } from 'zod';
import {
   CreateSubEventSchema,
   DeleteSubEventSchema,
   UpdateSubEventSchema,
} from './subEventSchema.js';

export type CreateSubEventRequest = z.infer<typeof CreateSubEventSchema>;
export type DeleteSubEventRequest = z.infer<typeof DeleteSubEventSchema>;
export type UpdateSubEventRequest = z.infer<typeof UpdateSubEventSchema>;
