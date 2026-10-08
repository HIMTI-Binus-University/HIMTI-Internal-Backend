import assert from 'node:assert/strict';
import test from 'node:test';
import { prisma } from '@/config/prisma.js';
import { eventRegistrationRepository as repo } from './eventRegistrationRepository.js';
import { eventRegistrationService } from './eventRegistrationService.js';
import { eventService } from '@/features/events/eventService.js';
import routes from './eventRegistrationRoutes.js';

test('organizer tracking requires object scope and protected middleware', async (t) => {
   t.mock.method(eventService, 'assertScope', async () => {
      throw new Error('Event scope required');
   });
   const tracking = t.mock.method(repo, 'supplementalTracking', async () => []);
   await assert.rejects(
      eventRegistrationService.supplementalTracking(
         'foreign-event',
         { page: 1, limit: 25 },
         { id: 'organizer' },
      ),
      /scope required/,
   );
   assert.equal(tracking.mock.callCount(), 0);
   const route = routes.stack.find(
      (layer) =>
         layer.route?.path ===
         '/internal/events/:eventId/registrations/outstanding-answers',
   )?.route;
   assert.equal(route?.stack.length, 3);
});

test('internal registration detail requires object scope and excludes payment data', async (t) => {
   t.mock.method(eventService, 'assertScope', async () => {
      throw new Error('Event scope required');
   });
   const detail = t.mock.method(repo, 'internalRegistration');
   await assert.rejects(
      eventRegistrationService.internalRegistration('foreign-event', 'order', {
         id: 'reviewer',
      }),
      /scope required/,
   );
   assert.equal(detail.mock.callCount(), 0);
   for (const path of [
      '/internal/events/:eventId/registrations',
      '/internal/events/:eventId/registrations/:registrationId',
   ]) {
      const route = routes.stack.find(
         (layer) => layer.route?.path === path,
      )?.route;
      assert.equal(route?.stack.length, 3);
   }
   const repository = await import('node:fs/promises').then(({ readFile }) =>
      readFile(
         new URL('./eventRegistrationRepository.ts', import.meta.url),
         'utf8',
      ),
   );
   const safeDetail = repository.slice(
      repository.indexOf('const internalDetailInclude'),
      repository.indexOf('const createAnswers'),
   );
   assert.doesNotMatch(
      safeDetail,
      /payment:|bundleCode|password|tokenHash|storageKey/,
   );
});

test('supplemental saves enforce ownership, revision and typed question scope without lifecycle writes', async (t) => {
   let owned = true;
   const saved: unknown[] = [];
   const locks: string[] = [];
   const tx = {
      $queryRaw: async (sql: TemplateStringsArray) => {
         locks.push(sql.join('?'));
         return [];
      },
      registrationOrder: {
         findFirst: async (args: unknown) => {
            assert.match(JSON.stringify(args), /session-user/);
            return owned ? { eventId: 'event' } : null;
         },
      },
      registrationOrderMember: {
         findFirst: async (args: unknown) => {
            assert.match(JSON.stringify(args), /"userId":"session-user"/);
            assert.match(
               JSON.stringify(args),
               /"status":\{"in":\["ACTIVE","LOCKED"\]\}/,
            );
            assert.match(
               JSON.stringify(args),
               /"withdrawnAt":null,"answeredAt":null/,
            );
            assert.match(
               JSON.stringify(args),
               /ASSEMBLING.*PENDING_PAYMENT.*PAYMENT_REVIEW.*CONFIRMED/,
            );
            return {
               id: 'member',
               supplementalRevision: 2,
               supplementalRequests: [
                  {
                     id: 'request',
                     questionId: 'question',
                     question: {
                        id: 'question',
                        fieldKey: 'age',
                        type: 'NUMBER',
                        isRequired: true,
                        validation: { min: 1 },
                        options: [],
                     },
                  },
               ],
            };
         },
         update: async (args: unknown) => {
            saved.push(args);
         },
      },
      supplementalQuestionRequest: {
         update: async (args: unknown) => {
            saved.push(args);
         },
      },
   };
   const original = prisma.$transaction;
   t.after(() => {
      prisma.$transaction = original;
   });
   prisma.$transaction = (async (operation: (client: typeof tx) => unknown) =>
      operation(tx)) as unknown as typeof prisma.$transaction;
   const body = {
      expectedRevision: 2,
      answers: [{ questionId: 'question', value: 20 }],
   };
   await repo.saveSupplemental('order', 'session-user', body);
   assert.equal(saved.length, 2);
   assert.match(locks[0]!, /FROM events/);
   assert.match(locks[1]!, /FROM registration_orders/);
   assert.match(JSON.stringify(saved), /supplementalRevision/);
   assert.doesNotMatch(
      JSON.stringify(saved),
      /"status"|payment|ticket|capacity/,
   );
   await assert.rejects(
      repo.saveSupplemental('order', 'session-user', {
         ...body,
         expectedRevision: 1,
      }),
      /changed/,
   );
   await assert.rejects(
      repo.saveSupplemental('order', 'session-user', {
         ...body,
         answers: [{ questionId: 'foreign-question', value: 1 }],
      }),
      /Unknown question/,
   );
   await assert.rejects(
      repo.saveSupplemental('order', 'session-user', {
         ...body,
         answers: [{ questionId: 'question', value: 'wrong type' }],
      }),
      /number/,
   );
   owned = false;
   await assert.rejects(
      repo.saveSupplemental('order', 'session-user', body),
      /not found/,
   );
});
