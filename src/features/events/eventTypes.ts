import { z } from 'zod';
import { CreateEventSchema } from './eventSchema.js';

export type CreateEventRequest = z.infer<typeof CreateEventSchema>;
