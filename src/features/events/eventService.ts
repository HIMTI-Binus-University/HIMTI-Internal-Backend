import { Event, Prisma } from '@prisma/client';
import { CreateEventRequest } from './eventTypes.js';
import { auth } from '@/utils/auth.js';
import { eventRepository } from './eventRepository.js';

class EventService {
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
      };
      return await eventRepository.create(eventData);
   }
}

export const eventService = new EventService();
