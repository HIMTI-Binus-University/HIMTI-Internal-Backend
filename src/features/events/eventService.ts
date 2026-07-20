import { Event, Prisma } from '@prisma/client';
<<<<<<< Updated upstream
import { CreateEventRequest } from './eventTypes.js';
import { auth } from '@/utils/auth.js';
import { eventRepository } from './eventRepository.js';

class EventService {
=======
import type {
   CreateEventRequest,
   EventDetail,
   EventListSubEvent,
   GetEventQuery,
   GetEventResponse,
   UpdateEventRequest,
} from './eventTypes.js';
import { auth } from '@/utils/auth.js';
import {
   eventRepository,
   type EventSubEventQueryResult,
} from './eventRepository.js';
import { AppError } from '@/utils/appError.js';
import { eventCommitteeService } from '@/features/event-committee/eventCommitteeService.js';
import { isAdminUser } from '@/utils/statusAccess.js';

class EventService {
   private formatSubEvent(
      subEvent: EventSubEventQueryResult,
   ): EventListSubEvent {
      const { registrationForms, participants, _count, ...subEventData } =
         subEvent;

      return {
         ...subEventData,
         registrationForms: registrationForms.map(
            ({ _count: formCount, ...form }) => ({
               ...form,
               questionCount: formCount.questions,
            }),
         ),
         participantCount: _count.participants,
         submittedResponseCount: participants.reduce(
            (total, participant) =>
               total + participant._count.registrationResponses,
            0,
         ),
      };
   }

   private formatEventSubEvents<
      T extends { subevents: EventSubEventQueryResult[] },
   >(event: T): Omit<T, 'subevents'> & { subevents: EventListSubEvent[] } {
      return {
         ...event,
         subevents: event.subevents.map((subEvent) =>
            this.formatSubEvent(subEvent),
         ),
      };
   }

   async getEvents(
      params: GetEventQuery,
      user: typeof auth.$Infer.Session.user,
   ): Promise<GetEventResponse> {
      const { data, total } = await eventRepository.findAllForCommitteeUser(
         params,
         user.id,
      );

      return {
         data: data.map((event) => this.formatEventSubEvents(event)),
         meta: {
            page: params.page,
            limit: params.limit,
            totalRecords: total,
            totalPages: Math.ceil(total / params.limit),
         },
      };
   }

   async getEventById(
      id: string,
      user: typeof auth.$Infer.Session.user,
   ): Promise<EventDetail> {
      const event = await eventRepository.findDetailById(id);

      if (!event) {
         throw new AppError('Event not found', 404);
      }

      if (!isAdminUser(user)) {
         await eventCommitteeService.assertEventCommitteeMember(
            event.id,
            user.id,
         );
      }

      return this.formatEventSubEvents(event);
   }

>>>>>>> Stashed changes
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
