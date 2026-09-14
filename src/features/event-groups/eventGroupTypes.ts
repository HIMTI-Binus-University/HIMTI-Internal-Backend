import { z } from 'zod';
import {
   EventGroupBodySchema,
   EventGroupListSchema,
   EventGroupUpdateSchema,
} from './eventGroupSchema.js';
export type EventGroupBody = z.infer<typeof EventGroupBodySchema>;
export type EventGroupUpdate = z.infer<typeof EventGroupUpdateSchema>;
export type EventGroupList = z.infer<typeof EventGroupListSchema>;
