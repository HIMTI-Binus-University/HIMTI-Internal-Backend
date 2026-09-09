import assert from 'node:assert/strict';
import test from 'node:test';
import { eventService } from '@/features/events/eventService.js';
import { eventTicketRepository as repo } from './eventTicketRepository.js';
import routes from './eventTicketRoutes.js';
import { eventTicketService as service } from './eventTicketService.js';

test('participant ticket routes require authentication and organizer routes require permissions', () => {
   for (const path of [
      '/me/event-tickets',
      '/me/event-tickets/:ticketId',
      '/me/event-tickets/:ticketId/credential',
   ]) {
      const route = routes.stack.find(
         (layer) => layer.route?.path === path,
      )?.route;
      assert.equal(route?.stack.length, 2);
   }
   for (const path of [
      '/internal/events/:eventId/tickets/search',
      '/internal/events/:eventId/attendance',
      '/internal/events/:eventId/tickets/check-in',
      '/internal/events/:eventId/tickets/manual-check-in',
      '/internal/events/:eventId/attendance/:attendanceId/checkout',
      '/internal/events/:eventId/attendance/:attendanceId/void',
   ]) {
      const route = routes.stack.find(
         (layer) => layer.route?.path === path,
      )?.route;
      assert.equal(route?.stack.length, 3);
   }
});

test('participant detail and credential access use the authenticated owner', async (t) => {
   const owned = t.mock.method(
      repo,
      'owned',
      async (_id: string, userId: string) => {
         assert.equal(userId, 'session-user');
         return null;
      },
   );
   const recover = t.mock.method(
      repo,
      'recover',
      async (_id: string, userId: string) => {
         assert.equal(userId, 'session-user');
         return null;
      },
   );
   await assert.rejects(
      service.detail('foreign-ticket', 'session-user'),
      (error) => {
         assert.equal((error as { code: string }).code, 'TICKET_NOT_FOUND');
         return true;
      },
   );
   await assert.rejects(
      service.credential('foreign-ticket', 'session-user'),
      (error) => {
         assert.equal((error as { code: string }).code, 'TICKET_NOT_FOUND');
         return true;
      },
   );
   assert.equal(owned.mock.callCount(), 1);
   assert.equal(recover.mock.callCount(), 1);
});

test('organizer attendance operations deny cross-event scope before repository access', async (t) => {
   t.mock.method(eventService, 'assertScope', async () => {
      throw new Error('Event scope required');
   });
   const search = t.mock.method(repo, 'search');
   const checkIn = t.mock.method(repo, 'checkIn');
   const checkout = t.mock.method(repo, 'checkout');
   const voidAttendance = t.mock.method(repo, 'void');
   const actor = { id: 'organizer' };
   await assert.rejects(
      service.search(
         'foreign-event',
         { search: '', page: 1, limit: 25 },
         actor,
      ),
      /scope required/,
   );
   await assert.rejects(
      service.checkIn('foreign-event', { ticketId: 'ticket' }, actor),
      /scope required/,
   );
   await assert.rejects(
      service.checkout('foreign-event', 'attendance', 1, actor),
      /scope required/,
   );
   await assert.rejects(
      service.void('foreign-event', 'attendance', 1, 'Wrong scan', actor),
      /scope required/,
   );
   assert.equal(search.mock.callCount(), 0);
   assert.equal(checkIn.mock.callCount(), 0);
   assert.equal(checkout.mock.callCount(), 0);
   assert.equal(voidAttendance.mock.callCount(), 0);
});

test('voiding attendance preserves the transition and maps duplicate state', async (t) => {
   t.mock.method(
      eventService,
      'assertScope',
      async () =>
         ({
            attendanceEnabled: true,
         }) as never,
   );
   const voidAttendance = t.mock.method(repo, 'void', async () => ({
      result: 'DUPLICATE' as const,
      attendance: {} as never,
   }));
   await assert.rejects(
      service.void('event', 'attendance', 3, 'Wrong participant', {
         id: 'actor',
      }),
      (error) => {
         assert.equal(
            (error as { code: string }).code,
            'ATTENDANCE_ALREADY_VOIDED',
         );
         return true;
      },
   );
   assert.deepEqual(voidAttendance.mock.calls[0]?.arguments, [
      'event',
      'attendance',
      3,
      'Wrong participant',
      'actor',
   ]);
});

test('attendance state guards return stable disabled, duplicate, and revision errors', async (t) => {
   t.mock.method(
      eventService,
      'assertScope',
      async () =>
         ({
            attendanceEnabled: true,
         }) as never,
   );
   const checkIn = t.mock.method(repo, 'checkIn', async () => ({
      result: 'DUPLICATE' as const,
      attendance: {} as never,
   }));
   await assert.rejects(
      service.checkIn('event', { credential: 'ticket-code' }, { id: 'actor' }),
      (error) => {
         assert.equal((error as { code: string }).code, 'ALREADY_CHECKED_IN');
         return true;
      },
   );
   assert.equal(checkIn.mock.calls[0]?.arguments[0], 'event');
   assert.notEqual(checkIn.mock.calls[0]?.arguments[2], 'ticket-code');

   t.mock.method(repo, 'checkout', async () => ({
      result: 'CONFLICT' as const,
   }));
   await assert.rejects(
      service.checkout('event', 'attendance', 2, { id: 'actor' }),
      (error) => {
         assert.equal((error as { code: string }).code, 'REVISION_CONFLICT');
         return true;
      },
   );
});

test('attendance search is blocked when the Event has attendance disabled', async (t) => {
   t.mock.method(
      eventService,
      'assertScope',
      async () =>
         ({
            attendanceEnabled: false,
         }) as never,
   );
   const search = t.mock.method(repo, 'search');
   await assert.rejects(
      service.search(
         'event',
         { search: '', page: 1, limit: 25 },
         { id: 'organizer' },
      ),
      (error) => {
         assert.equal((error as { code: string }).code, 'ATTENDANCE_DISABLED');
         return true;
      },
   );
   assert.equal(search.mock.callCount(), 0);
});
