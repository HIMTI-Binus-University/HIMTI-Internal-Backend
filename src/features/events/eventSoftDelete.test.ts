import assert from 'node:assert/strict';
import test from 'node:test';
import routes from './eventRoutes.js';
import { eventRepository } from './eventRepository.js';
import { eventService } from './eventService.js';

test('event deletion is permission protected', () => {
   const route = routes.stack.find(
      (layer) => layer.route?.path === '/internal/events/:eventId',
   )?.route;
   assert.ok(route);
   assert.equal(
      route.stack.some((layer) => layer.method === 'delete'),
      true,
   );
   assert.equal(route.stack.length, 6);
});

test('event deletion maps eligibility failures and accepts an eligible draft', async (t) => {
   const softDelete = t.mock.method(eventRepository, 'softDelete');
   const user = { id: 'manager' };

   for (const [result, statusCode, message] of [
      ['NOT_FOUND', 404, 'Event not found'],
      ['FORBIDDEN', 403, 'Event manager scope required'],
      ['NOT_DRAFT', 409, 'Only draft events can be deleted'],
      ['HAS_ORDERS', 409, 'Events with registration orders cannot be deleted'],
   ] as const) {
      softDelete.mock.mockImplementationOnce(async () => ({ result }));
      await assert.rejects(eventService.delete('event-1', user), (error) => {
         assert.equal((error as { statusCode: number }).statusCode, statusCode);
         assert.equal((error as Error).message, message);
         return true;
      });
   }

   softDelete.mock.mockImplementationOnce(async () => ({ result: 'DELETED' }));
   await eventService.delete('event-1', user);
   assert.equal(softDelete.mock.callCount(), 5);
});
