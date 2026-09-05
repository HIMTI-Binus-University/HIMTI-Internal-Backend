import { Prisma } from '@prisma/client';
import { AppError } from '@/utils/appError.js';
import { isAdminUser } from '@/utils/statusAccess.js';
import { eventRepository } from './eventRepository.js';
import type {
   CreateEventRequest,
   EventListQuery,
   UpdateEventRequest,
   RegistrationSettingsRequest,
} from './eventTypes.js';

type User = { id: string; roles?: unknown };
class EventService {
   listPublic(query: EventListQuery) {
      return eventRepository.listPublic(query);
   }
   async getPublic(id: string) {
      const event = await eventRepository.getPublic(id);
      if (!event) throw new AppError('Event not found', 404);
      return event;
   }
   listInternal(query: EventListQuery, user: User) {
      return eventRepository.listInternal(query, user.id, isAdminUser(user));
   }
   async assertScope(id: string, user: User) {
      const event = await eventRepository.find(id);
      if (!event) throw new AppError('Event not found', 404);
      if (!isAdminUser(user) && !(await eventRepository.hasScope(id, user.id)))
         throw new AppError('Event scope required', 403);
      return event;
   }
   async assertManagerScope(id: string, user: User) {
      const event = await eventRepository.find(id);
      if (!event) throw new AppError('Event not found', 404);
      if (
         !isAdminUser(user) &&
         !(await eventRepository.hasManagerScope(id, user.id))
      )
         throw new AppError('Event manager scope required', 403);
      return event;
   }
   async create(payload: CreateEventRequest, user: User) {
      const {
         eventGroupId,
         individualTicketPriceMinor,
         individualTicketCurrency,
         ...fields
      } = payload;
      if (eventGroupId && !(await eventRepository.findEventGroup(eventGroupId)))
         throw new AppError('Event group not found', 404);
      if (
         eventGroupId &&
         !isAdminUser(user) &&
         !(await eventRepository.hasEventGroupManagerScope(
            eventGroupId,
            user.id,
         ))
      )
         throw new AppError('Event group scope required', 403);
      return eventRepository.create({
         ...fields,
         ...(eventGroupId && {
            eventGroup: { connect: { id: eventGroupId } },
         }),
         creator: { connect: { id: user.id } },
         organizers: {
            create: { userId: user.id, role: 'MANAGER', assignedBy: user.id },
         },
         ticketPackages: {
            create: {
               code: 'INDIVIDUAL_TICKET',
               name: 'Individual Ticket',
               status: 'ACTIVE',
               seatCount: 1,
               currency: individualTicketCurrency,
               priceMinor: individualTicketPriceMinor,
            },
         },
      } as Prisma.EventCreateInput);
   }
   async update(id: string, payload: UpdateEventRequest, user: User) {
      await this.assertManagerScope(id, user);
      const { eventGroupId, ...fields } = payload;
      if (eventGroupId && !(await eventRepository.findEventGroup(eventGroupId)))
         throw new AppError('Event group not found', 404);
      if (
         eventGroupId &&
         !isAdminUser(user) &&
         !(await eventRepository.hasEventGroupManagerScope(
            eventGroupId,
            user.id,
         ))
      )
         throw new AppError('Event group scope required', 403);
      return eventRepository.update(id, {
         ...fields,
         ...(eventGroupId !== undefined && {
            eventGroup: eventGroupId
               ? { connect: { id: eventGroupId } }
               : { disconnect: true },
         }),
         updater: { connect: { id: user.id } },
      });
   }
   async transition(
      id: string,
      status: 'PUBLISHED' | 'CLOSED' | 'CANCELLED',
      user: User,
   ) {
      const event = await this.assertManagerScope(id, user);
      if (event.status === 'CANCELLED')
         throw new AppError('Cancelled event is terminal', 409);
      return eventRepository.update(id, {
         status,
         updater: { connect: { id: user.id } },
         ...(status !== 'PUBLISHED' && { isRegistrationOpen: false }),
      });
   }
   async organizers(id: string, user: User) {
      await this.assertScope(id, user);
      return eventRepository.organizers(id);
   }
   async addOrganizer(
      id: string,
      targetId: string,
      role: 'MANAGER' | 'ORGANIZER',
      user: User,
   ) {
      await this.assertManagerScope(id, user);
      return eventRepository.addOrganizer(id, targetId, role, user.id);
   }
   async updateOrganizer(
      id: string,
      targetId: string,
      role: 'MANAGER' | 'ORGANIZER',
      user: User,
   ) {
      await this.assertManagerScope(id, user);
      const result = await eventRepository.changeOrganizer(id, targetId, role);
      if (result.result === 'NOT_FOUND')
         throw new AppError('Event organizer not found', 404);
      if (result.result === 'LAST_MANAGER')
         throw new AppError('The last Event manager cannot be demoted', 409);
      return result.data;
   }
   async removeOrganizer(id: string, targetId: string, user: User) {
      await this.assertManagerScope(id, user);
      const result = await eventRepository.changeOrganizer(id, targetId, null);
      if (result.result === 'NOT_FOUND')
         throw new AppError('Event organizer not found', 404);
      if (result.result === 'LAST_MANAGER')
         throw new AppError('The last Event manager cannot be removed', 409);
      return result.data;
   }
   async getRegistrationSettings(id: string, user: User) {
      await this.assertScope(id, user);
      return eventRepository.registrationSettings(id);
   }
   async updateRegistrationSettings(
      id: string,
      payload: RegistrationSettingsRequest,
      user: User,
   ) {
      const event = await this.assertScope(id, user);
      if (
         event.startsAt &&
         payload.registrationClosesAt &&
         payload.registrationClosesAt > event.startsAt
      )
         throw new AppError(
            'Registration must close before the Event starts',
            400,
         );
      await eventRepository.update(id, {
         ...payload,
         updater: { connect: { id: user.id } },
      });
      return eventRepository.registrationSettings(id);
   }
}
export const eventService = new EventService();
