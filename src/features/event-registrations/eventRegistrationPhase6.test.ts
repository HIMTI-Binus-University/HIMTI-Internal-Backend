import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
   bulkRegistrationDecisionSchema,
   internalRegistrationListSchema,
   registrationReasonDecisionSchema,
} from './eventRegistrationSchema.js';
import {
   buildInternalRegistrationWhere,
   correctionResubmissionStatus,
} from './eventRegistrationRepository.js';
import { registrationReviewCapabilities } from './eventRegistrationService.js';

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

   it('derives paid correction transitions without resetting payment state', () => {
      assert.equal(
         correctionResubmissionStatus('VERIFIED', 'MANUAL_REVIEW'),
         'PENDING_APPROVAL',
      );
      assert.equal(
         correctionResubmissionStatus('VERIFIED', 'AUTO_APPROVE'),
         'APPROVED',
      );
      assert.equal(
         correctionResubmissionStatus('PROOF_SUBMITTED', 'MANUAL_REVIEW'),
         'PAYMENT_REVIEW',
      );
      for (const status of ['UNPAID', 'REJECTED'])
         assert.equal(
            correctionResubmissionStatus(status, 'MANUAL_REVIEW'),
            'PENDING_PAYMENT',
         );
      for (const status of [null, 'EXPIRED', 'CANCELLED'])
         assert.equal(
            correctionResubmissionStatus(status, 'MANUAL_REVIEW'),
            null,
         );
   });

   it('exposes review capabilities for corrected paid registrations', () => {
      assert.deepEqual(registrationReviewCapabilities('PENDING_APPROVAL'), [
         'approve',
         'request-correction',
         'reject',
         'admin-cancel',
      ]);
      assert.deepEqual(registrationReviewCapabilities('PAYMENT_REVIEW'), []);
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
         /'DRAFT',[\s\S]*'AWAITING_MEMBERS',[\s\S]*'HOLDING',[\s\S]*'NEEDS_CORRECTION'/,
      );
      assert.match(
         source('./eventRegistrationRepository.ts'),
         /!isCorrection &&[\s\S]*registrationClosesAt/,
      );
   });

   it('exposes correction metadata only in participant detail and gates edits', () => {
      const schema = source('./eventRegistrationSchema.ts');
      const detail = schema.slice(
         schema.indexOf('export const registrationDetailSchema'),
         schema.indexOf('export const registrationContextSchema'),
      );
      assert.match(detail, /correctionReason: z\.string\(\)\.nullable\(\)/);
      assert.match(
         detail,
         /correctionDeadlineAt: z\.string\(\)\.datetime\(\)\.nullable\(\)/,
      );
      const repository = source('./eventRegistrationRepository.ts');
      const replace = repository.slice(
         repository.indexOf('async replaceResponses('),
         repository.indexOf('async submit('),
      );
      assert.match(replace, /status === 'NEEDS_CORRECTION'/);
      assert.match(replace, /new Date\(\) >= order\.correctionDeadlineAt/);
      assert.match(replace, /ResponseCorrectionDeadlinePassed/);
      const service = source('./eventRegistrationService.ts');
      assert.match(service, /code:[\s\S]*'CORRECTION_REQUIRED'/);
      assert.match(service, /action: 'RESUME'/);
      assert.match(service, /CORRECTION_DEADLINE_PASSED/);
   });
});
