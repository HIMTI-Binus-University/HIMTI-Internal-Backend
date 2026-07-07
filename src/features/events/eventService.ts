import { Event, Prisma } from '@prisma/client';
import type {
   CreateEventRequest,
   GetEventQuery,
   GetEventResponse,
   UpdateEventRequest,
} from './eventTypes.js';
import { auth } from '@/utils/auth.js';
import { eventRepository } from './eventRepository.js';
import { AppError } from '@/utils/appError.js';
import { eventCommitteeService } from '@/features/event-committee/eventCommitteeService.js';

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

   async updateEvent(
      payload: UpdateEventRequest,
      id: string,
      user: typeof auth.$Infer.Session.user,
   ): Promise<Event> {
      const event = await eventRepository.findById(id);

      if (!event) {
         throw new AppError('Event not found', 404);
      }

      await eventCommitteeService.assertEventSteeringCommitteeMemberOrAdmin(
         event.id,
         user,
      );

      if (payload.status === 'CANCELLED') {
         return await eventRepository.cancelEvent(id, user.id);
      }

      const updateData: Prisma.EventUpdateInput = {
         name: payload.name,
         publicDescription: payload.publicDescription,
         coverImageUrl: payload.coverImageUrl,
         status: payload.status,
         updater: {
            connect: {
               id: user.id,
            },
         },
      };

      return await eventRepository.update(id, updateData);
   }

   async deleteEvent(
      id: string,
      user: typeof auth.$Infer.Session.user,
   ): Promise<Event> {
      const event = await eventRepository.findById(id);

      if (!event) {
         throw new AppError('Event not found', 404);
      }

      await eventCommitteeService.assertEventSteeringCommitteeMemberOrAdmin(
         event.id,
         user,
      );

      return await eventRepository.cancelEvent(id, user.id);
   }
}

export const eventService = new EventService();
