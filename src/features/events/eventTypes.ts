import { z } from 'zod';
<<<<<<< Updated upstream
import { CreateEventSchema } from './eventSchema.js';

export type CreateEventRequest = z.infer<typeof CreateEventSchema>;
=======
import {
   CreateEventSchema,
   DeleteEventSchema,
   GetEventSchema,
   UpdateEventSchema,
} from './eventSchema.js';
import type {
   EventStatus,
   RegistrationFormStatus,
   SubeventStatus,
   SubeventType,
   SubeventVisibility,
} from '@prisma/client';

export type CreateEventRequest = z.infer<typeof CreateEventSchema>;
export type DeleteEventRequest = z.infer<typeof DeleteEventSchema>;
export type GetEventQuery = z.infer<typeof GetEventSchema>;
export type UpdateEventRequest = z.infer<typeof UpdateEventSchema>;

export interface EventListSubEvent {
   id: string;
   eventId: string;
   name: string;
   publicDescription: string | null;
   privateDescription: string | null;
   date: Date;
   type: SubeventType;
   locationName: string | null;
   locationUrl: string | null;
   price: number;
   paid: boolean;
   paymentAccountBank: string;
   paymentAccountNumber: number | null;
   paymentAccountName: string | null;
   priceModifier: number | null;
   paymentDesc: string;
   maxParticipants: number | null;
   maxTicketsPerUser: number | null;
   isRegistrationOpen: boolean;
   autoAcceptRegistration: boolean;
   visibility: SubeventVisibility;
   status: SubeventStatus;
   createdAt: Date;
   createdBy: string;
   updatedAt: Date | null;
   updatedBy: string | null;
   registrationForms: {
      id: string;
      status: RegistrationFormStatus;
      questionCount: number;
   }[];
   participantCount: number;
   submittedResponseCount: number;
}

export interface EventListItem {
   id: string;
   name: string;
   publicDescription: string | null;
   coverImageUrl: string | null;
   status: EventStatus;
   createdAt: Date;
   updatedAt: Date | null;
   subevents: EventListSubEvent[];
}

export interface EventDetail extends EventListItem {
   createdBy: string;
   updatedBy: string | null;
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
>>>>>>> Stashed changes
