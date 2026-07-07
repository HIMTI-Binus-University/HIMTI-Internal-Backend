import { Event, Prisma } from '@prisma/client';
import type {
   CreateEventRequest,
   GetEventQuery,
   GetEventResponse,
} from './eventTypes.js';
import { auth } from '@/utils/auth.js';
import { eventRepository } from './eventRepository.js';

class EventService {
   async getEvents(
      params: GetEventQuery,
      user: typeof auth.$Infer.Session.user,
   ): Promise<GetEventResponse> {
      const { data, total } = await eventRepository.findAllForCommitteeUser(
         params,
         user.id,
      );

      return {
         data,
         meta: {
            page: params.page,
            limit: params.limit,
            totalRecords: total,
            totalPages: Math.ceil(total / params.limit),
         },
      };
   }

   async createEvent(
      payload: CreateEventRequest,
      user: typeof auth.$Infer.Session.user,
   ): Promise<Event> {
      const eventData: Prisma.EventCreateInput = {
         name: payload.name,
         publicDescription: payload.publicDescription,
         coverImageUrl: payload.coverImageUrl,
         status: payload.status,
         creator: {
            connect: {
               id: user.id,
            },
         },
         eventComittees: {
            create: {
               user: {
                  connect: {
                     id: user.id,
                  },
               },
            },
         },
      };
      return await eventRepository.create(eventData);
   }
}

export const eventService = new EventService();
