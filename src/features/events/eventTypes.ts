import { z } from 'zod';
import {
   CreateEventSchema,
   DeleteEventSchema,
   GetEventSchema,
   UpdateEventSchema,
} from './eventSchema.js';
import type {
   EventStatus,
   SubeventStatus,
   SubeventType,
   SubeventVisibility,
} from '@prisma/client';

export type CreateEventRequest = z.infer<typeof CreateEventSchema>;
export type DeleteEventRequest = z.infer<typeof DeleteEventSchema>;
export type GetEventQuery = z.infer<typeof GetEventSchema>;
export type UpdateEventRequest = z.infer<typeof UpdateEventSchema>;

export interface EventListItem {
   id: string;
   name: string;
   publicDescription: string | null;
   coverImageUrl: string | null;
   status: EventStatus;
   createdAt: Date;
   updatedAt: Date | null;
   subevents: {
      id: string;
      eventId: string;
      name: string;
      date: Date;
      type: SubeventType;
      visibility: SubeventVisibility;
      status: SubeventStatus;
   }[];
}

export interface GetEventResponse {
   data: EventListItem[];
   meta: {
      page: number;
      limit: number;
      totalRecords: number;
      totalPages: number;
   };
}
