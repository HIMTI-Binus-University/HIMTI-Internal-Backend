import { z } from 'zod';
import {
   CreateSubEventSchema,
   DeleteSubEventSchema,
   GetSubEventSchema,
   UpdateSubEventSchema,
} from './subEventSchema.js';
import type {
   RegistrationFormStatus,
   SubeventStatus,
   SubeventType,
   SubeventVisibility,
} from '@prisma/client';

export type CreateSubEventRequest = z.infer<typeof CreateSubEventSchema>;
export type DeleteSubEventRequest = z.infer<typeof DeleteSubEventSchema>;
export type GetSubEventQuery = z.infer<typeof GetSubEventSchema>;
export type UpdateSubEventRequest = z.infer<typeof UpdateSubEventSchema>;

export interface SubEventListItem {
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
   visibility: SubeventVisibility;
   status: SubeventStatus;
   isRegistrationOpen: boolean;
   autoAcceptRegistration: boolean;
   maxParticipants: number | null;
   maxTicketsPerUser: number | null;
   registrationForms: {
      id: string;
      status: RegistrationFormStatus;
      questionCount: number;
   }[];
   participantCount: number;
   submittedResponseCount: number;
}

export interface GetSubEventResponse {
   data: SubEventListItem[];
   meta: {
      page: number;
      limit: number;
      totalRecords: number;
      totalPages: number;
   };
}
