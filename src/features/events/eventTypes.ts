import { z } from 'zod';
import {
   CreateEventSchema,
   EventListSchema,
   RegistrationSettingsSchema,
   UpdateEventSchema,
} from './eventSchema.js';

export type CreateEventRequest = z.infer<typeof CreateEventSchema>;
export type UpdateEventRequest = z.infer<typeof UpdateEventSchema>;
export type EventListQuery = z.infer<typeof EventListSchema>;
export type RegistrationSettingsRequest = z.infer<
   typeof RegistrationSettingsSchema
>;
