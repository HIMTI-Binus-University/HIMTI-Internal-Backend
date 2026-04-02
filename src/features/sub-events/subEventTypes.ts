import { z } from 'zod';
import { CreateSubEventSchema } from './subEventSchema.js';

export type CreateSubEventRequest = z.infer<typeof CreateSubEventSchema>;
