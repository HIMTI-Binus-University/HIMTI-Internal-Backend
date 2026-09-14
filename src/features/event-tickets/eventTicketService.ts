import { AppError } from '@/utils/appError.js';
import { eventService } from '@/features/events/eventService.js';
import { eventTicketRepository as repo } from './eventTicketRepository.js';
import {
   decryptTicketCredential,
   hashTicketCredential,
} from './eventTicketTypes.js';
import type { z } from 'zod';
import type { TicketSearchSchema } from './eventTicketSchema.js';

type Actor = { id: string; roles?: unknown };
type Search = z.infer<typeof TicketSearchSchema>;

const present = (ticket: Awaited<ReturnType<typeof repo.owned>>) => {
   if (!ticket) return null;
   return {
      id: ticket.id,
      eventId: ticket.eventId,
      status: ticket.status,
      issuedAt: ticket.issuedAt,
      expiresAt: ticket.expiresAt,
      event: ticket.event,
      attendance: ticket.checkIns[0] ?? null,
   };
};

class EventTicketService {
   async list(userId: string) {
      return Promise.all(
         (await repo.listOwned(userId)).map(async (ticket) => present(ticket)),
      );
   }
   async detail(id: string, userId: string) {
      const ticket = present(await repo.owned(id, userId));
      if (!ticket)
         throw new AppError('Ticket not found', 404, 'TICKET_NOT_FOUND');
      return ticket;
   }
   async credential(id: string, userId: string) {
      const encrypted = await repo.recover(id, userId);
      if (!encrypted)
         throw new AppError('Ticket not found', 404, 'TICKET_NOT_FOUND');
      const credential = decryptTicketCredential(encrypted);
      return { credential, qrPayload: credential };
   }
   async search(eventId: string, query: Search, actor: Actor) {
      const event = await eventService.assertScope(eventId, actor);
      if (!event.attendanceEnabled)
         throw new AppError(
            'Attendance is disabled for this event',
            409,
            'ATTENDANCE_DISABLED',
         );
      const [data, totalRecords] = await repo.search(eventId, query);
      return {
         data: data.map(({ orderMember, checkIns, ...ticket }) => ({
            ...ticket,
            name: orderMember.snapshotName,
            email: orderMember.snapshotEmail,
            nim: orderMember.snapshotNim,
            orderNumber: orderMember.order.orderNumber,
            attendance: checkIns[0] ?? null,
         })),
         meta: {
            page: query.page,
            limit: query.limit,
            totalRecords,
            totalPages: Math.ceil(totalRecords / query.limit),
         },
      };
   }
   async checkIn(
      eventId: string,
      input: { credential?: string; ticketId?: string },
      actor: Actor,
   ) {
      await eventService.assertScope(eventId, actor);
      const result = await repo.checkIn(
         eventId,
         input.ticketId ?? null,
         input.credential ? hashTicketCredential(input.credential) : null,
         actor.id,
      );
      if (result.result === 'DISABLED')
         throw new AppError(
            'Attendance is disabled for this event',
            409,
            'ATTENDANCE_DISABLED',
         );
      if (result.result === 'INVALID')
         throw new AppError(
            'Ticket is invalid or unavailable',
            404,
            'TICKET_UNAVAILABLE',
         );
      if (result.result === 'DUPLICATE')
         throw new AppError(
            'Participant is already checked in',
            409,
            'ALREADY_CHECKED_IN',
         );
      return result.attendance;
   }
   async checkout(eventId: string, id: string, revision: number, actor: Actor) {
      await eventService.assertScope(eventId, actor);
      const result = await repo.checkout(eventId, id, revision, actor.id);
      if (result.result === 'DISABLED')
         throw new AppError(
            'Attendance is disabled for this event',
            409,
            'ATTENDANCE_DISABLED',
         );
      if (result.result === 'CHECKOUT_DISABLED')
         throw new AppError(
            'Checkout is disabled for this event',
            409,
            'CHECKOUT_DISABLED',
         );
      if (result.result === 'NOT_FOUND')
         throw new AppError(
            'Attendance record not found',
            404,
            'ATTENDANCE_NOT_FOUND',
         );
      if (result.result === 'DUPLICATE')
         throw new AppError(
            'Participant is already checked out',
            409,
            'ALREADY_CHECKED_OUT',
         );
      if (result.result === 'CONFLICT')
         throw new AppError(
            'Attendance changed. Reload and try again.',
            409,
            'REVISION_CONFLICT',
         );
      return result.attendance;
   }
   async void(
      eventId: string,
      id: string,
      revision: number,
      reason: string,
      actor: Actor,
   ) {
      await eventService.assertScope(eventId, actor);
      const result = await repo.void(eventId, id, revision, reason, actor.id);
      if (result.result === 'DISABLED')
         throw new AppError(
            'Attendance is disabled for this event',
            409,
            'ATTENDANCE_DISABLED',
         );
      if (result.result === 'NOT_FOUND')
         throw new AppError(
            'Attendance record not found',
            404,
            'ATTENDANCE_NOT_FOUND',
         );
      if (result.result === 'DUPLICATE')
         throw new AppError(
            'Attendance record is already voided',
            409,
            'ATTENDANCE_ALREADY_VOIDED',
         );
      if (result.result === 'CONFLICT')
         throw new AppError(
            'Attendance changed. Reload and try again.',
            409,
            'REVISION_CONFLICT',
         );
      return result.attendance;
   }
}
export const eventTicketService = new EventTicketService();
