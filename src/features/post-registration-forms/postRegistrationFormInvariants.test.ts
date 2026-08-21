import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
   postRegistrationCorrectionSchema,
   savePostRegistrationResponseSchema,
} from './postRegistrationFormSchema.js';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const source = (path: string) => readFile(`${root}${path}`, 'utf8');

test('post-registration contracts use typed answers and future deadlines', () => {
   assert.equal(
      savePostRegistrationResponseSchema.safeParse({
         revision: null,
         answers: [{ questionId: 'q', type: 'TEXT', value: 'answer' }],
      }).success,
      true,
   );
   assert.equal(
      savePostRegistrationResponseSchema.safeParse({
         revision: 1,
         answers: [{ questionId: 'q', type: 'FILE', value: 'url' }],
      }).success,
      false,
   );
   assert.equal(
      postRegistrationCorrectionSchema.safeParse({
         revision: 1,
         reason: 'Fix the answer',
         deadlineAt: '2026-08-22T00:00:00.000Z',
      }).success,
      true,
   );
});

test('additive migration backfills before approved orders and preserves enum labels', async () => {
   const [enumMigration, migration] = await Promise.all([
      source(
         'prisma/migrations/20260821000000_add_post_registration_stage/migration.sql',
      ),
      source(
         'prisma/migrations/20260821010000_two_stage_post_registration/migration.sql',
      ),
   ]);
   assert.match(enumMigration, /ADD VALUE IF NOT EXISTS 'POST_REGISTRATION'/);
   assert.doesNotMatch(migration, /ADD VALUE IF NOT EXISTS/);
   assert.match(migration, /IN \('POST_SUBMISSION', 'POST_APPROVAL'\)/);
   assert.doesNotMatch(migration, /DROP TYPE|DROP TABLE|DROP COLUMN/);
   assert.doesNotMatch(
      migration,
      /ALTER TABLE "registration_form_assignments" ADD CONSTRAINT "registration_form_assignments_window_check"/,
   );
   assert.ok(
      migration.indexOf('post-existing-') <
         migration.indexOf('WHERE o."status" = \'APPROVED\''),
   );
   assert.match(migration, /assignments_buyer_family_key/);
   assert.match(migration, /assignments_member_family_key/);
   assert.match(migration, /snapshot is immutable/);
   assert.match(migration, /response linkage is inconsistent/);
});

test('all approval hooks and publish path call the reusable assignment engine', async () => {
   const [registration, payment, forms] = await Promise.all([
      source('src/features/event-registrations/eventRegistrationRepository.ts'),
      source('src/features/event-payments/eventPaymentRepository.ts'),
      source('src/features/registration-forms/registrationFormRepository.ts'),
   ]);
   assert.ok(
      registration.match(/assignPublishedPostRegistrationForms/g)!.length >= 3,
   );
   assert.match(
      payment,
      /nextOrder === 'APPROVED'[\s\S]*assignPublishedPostRegistrationForms/,
   );
   assert.match(
      forms,
      /stage === 'POST_REGISTRATION'[\s\S]*assignPublishedPostRegistrationForms/,
   );
});

test('participant and internal routes are protected and documented', async () => {
   const [routes, docs] = await Promise.all([
      source(
         'src/features/post-registration-forms/postRegistrationFormRoutes.ts',
      ),
      source(
         'src/features/post-registration-forms/postRegistrationFormDocs.ts',
      ),
   ]);
   assert.match(routes, /post-registration-assignments'[\s\S]*?requireAuth/);
   assert.match(routes, /requirePermission\('review_event_registrations'\)/);
   assert.match(docs, /listMyPostRegistrationAssignmentsV1/);
   assert.match(docs, /requestPostRegistrationCorrectionV1/);
   assert.match(docs, /reopenPostRegistrationAssignmentV1/);
});
