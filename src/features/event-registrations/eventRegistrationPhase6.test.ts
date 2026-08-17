import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
   bulkRegistrationDecisionSchema,
   internalRegistrationListSchema,
   registrationReasonDecisionSchema,
} from './eventRegistrationSchema.js';
import { buildInternalRegistrationWhere } from './eventRegistrationRepository.js';

const source = (name: string) =>
   readFileSync(fileURLToPath(new URL(name, import.meta.url)), 'utf8');

describe('phase 6 registration operations', () => {
   it('protects every internal route with review permission and sub-event scope', () => {
      const routes = source('./eventRegistrationRoutes.ts');
      assert.match(routes, /internal\/sub-events\/:subEventId\/registrations/);
      assert.match(routes, /internal\/event-registrations\/:registrationId/);
      const internalBlock = routes.slice(
         routes.indexOf('const reviewMiddleware'),
      );
      assert.match(internalBlock, /review_event_registrations/);
      assert.doesNotMatch(
         internalBlock,
         /internal[^\n]+\n\s*requireAuth,\n\s*(?:list|get)Internal/,
      );
   });

   it('bounds bulk CAS commands and requires correction reasons', () => {
      assert.equal(
         bulkRegistrationDecisionSchema.safeParse({
            items: Array.from({ length: 51 }, (_, revision) => ({
               registrationId: `r-${revision}`,
               revision: 1,
            })),
         }).success,
         false,
      );
      assert.equal(
         registrationReasonDecisionSchema.safeParse({ revision: 1 }).success,
         false,
      );
   });

   it('supports scoped aggregate and derived payment filters', () => {
      assert.equal(
         internalRegistrationListSchema.safeParse({
            responseStatus: 'NEEDS_CORRECTION',
            paymentStatus: 'NOT_REQUIRED',
         }).success,
         true,
      );
   });

   it('filters response status with the same aggregate precedence', () => {
      const filter = (
         responseStatus: NonNullable<
            Parameters<
               typeof buildInternalRegistrationWhere
            >[1]['responseStatus']
         >,
      ) => buildInternalRegistrationWhere('sub-event', { responseStatus }).AND;
      assert.deepEqual(filter('NEEDS_CORRECTION'), [
         { submissions: { some: { status: 'NEEDS_CORRECTION' } } },
      ]);
      for (const [status, excluded] of [
         ['DRAFT', ['NEEDS_CORRECTION']],
         ['SUBMITTED', ['NEEDS_CORRECTION', 'DRAFT']],
         ['LOCKED', ['NEEDS_CORRECTION', 'DRAFT', 'SUBMITTED']],
         ['SUPERSEDED', ['NEEDS_CORRECTION', 'DRAFT', 'SUBMITTED', 'LOCKED']],
      ] as const) {
         assert.deepEqual(filter(status), [
            { submissions: { some: { status } } },
            { submissions: { none: { status: { in: excluded } } } },
         ]);
      }
   });

   it('uses sub-event correction deadlines and locks before reviews', () => {
      const repository = source('./eventRegistrationRepository.ts');
      const review = repository.slice(repository.indexOf('async reviewMany('));
      assert.ok(
         review.indexOf('FOR UPDATE') <
            review.indexOf('registrationOrder.findMany'),
      );
      assert.match(review, /correctionDeadlineHours \?\? 24/);
      assert.match(review, /correctionDeadlineHours \* 60 \* 60 \* 1000/);
   });

   it('cleans terminal reviews and increments every cancellation revision', () => {
      const repository = source('./eventRegistrationRepository.ts');
      const review = repository.slice(repository.indexOf('async reviewMany('));
      assert.match(review, /registrationCapacityHold\.updateMany/);
      assert.match(review, /registrationTicket\.updateMany/);
      assert.match(review, /status: \{ in: \['PENDING', 'ACTIVE'\] \}/);
      assert.match(review, /registrationOrderMember\.updateMany/);
      assert.match(review, /status: \{ not: 'CANCELLED' \}/);
      assert.match(
         repository.slice(repository.indexOf('async cancel(')),
         /revision: \{ increment: 1 \}/,
      );
      assert.match(
         source('../events/eventRepository.ts'),
         /registrationOrder\.updateMany[\s\S]*revision: \{ increment: 1 \}/,
      );
      assert.match(
         source('../sub-events/subEventRepository.ts'),
         /registrationOrder\.updateMany[\s\S]*revision: \{ increment: 1 \}/,
      );
   });

   it('documents typed internal responses and conditional answer permission', () => {
      const docs = source('./eventRegistrationDocs.ts');
      assert.match(docs, /InternalRegistrationQueueV1/);
      assert.match(docs, /InternalRegistrationCapacityV1/);
      assert.match(docs, /InternalRegistrationDetailV1/);
      assert.match(docs, /InternalRegistrationQueueNeighborsV1/);
      assert.match(docs, /InternalRegistrationBulkReviewResultV1/);
      const service = source('./eventRegistrationService.ts');
      assert.match(service, /hasPermission\([\s\S]*view_event_answers/);
      const repository = source('./eventRegistrationRepository.ts');
      assert.match(repository, /status: 'ACTIVE'/);
      assert.match(repository, /subEventId/);
      assert.match(service, /responseStatus,/);
   });

   it('does not expose file keys and supports correction resubmission', () => {
      assert.match(source('./eventRegistrationService.ts'), /fileAvailable/);
      assert.doesNotMatch(source('./eventRegistrationService.ts'), /fileUrl:/);
      assert.match(
         source('./eventRegistrationRepository.ts'),
         /\['DRAFT', 'NEEDS_CORRECTION'\]/,
      );
      assert.match(
         source('./eventRegistrationRepository.ts'),
         /!isCorrection &&[\s\S]*registrationClosesAt/,
      );
   });
});
