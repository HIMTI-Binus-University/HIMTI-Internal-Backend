import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
   acceptedProofTypes,
   HARD_MAX_PROOF_BYTES,
   paymentQueueSchema,
   paymentSettingsSchema,
} from './eventPaymentSchema.js';
import { normalizePaymentBankSnapshot } from './paymentBankSnapshot.js';

const read = (path: string) => readFile(new URL(path, import.meta.url), 'utf8');

test('paid submit derives payment amount from the order snapshot', async () => {
   const source = await read(
      '../event-registrations/eventRegistrationRepository.ts',
   );
   assert.match(source, /amountMinor: order\.totalMinor/);
   assert.doesNotMatch(source, /amountMinor: payload/);
   assert.match(source, /PENDING_PAYMENT/);
});

test('new payments snapshot proof upload settings from the sub-event', async () => {
   const source = await read(
      '../event-registrations/eventRegistrationRepository.ts',
   );
   assert.match(
      source,
      /acceptedProofTypes: order\.subEvent\.paymentProofTypes/,
   );
   assert.match(source, /maxProofBytes: order\.subEvent\.paymentProofMaxBytes/);
});

test('legacy payment snapshots normalize to upload defaults and hard cap', () => {
   const legacy = normalizePaymentBankSnapshot({
      bankName: 'Bank',
      accountHolder: 'HIMTI',
      accountNumber: '123',
      instructions: null,
   });
   assert.deepEqual(legacy.acceptedProofTypes, [...acceptedProofTypes]);
   assert.equal(legacy.maxProofBytes, HARD_MAX_PROOF_BYTES);

   const complete = normalizePaymentBankSnapshot({
      ...legacy,
      acceptedProofTypes: ['application/pdf'],
      maxProofBytes: 1024,
   });
   assert.deepEqual(complete.acceptedProofTypes, ['application/pdf']);
   assert.equal(complete.maxProofBytes, 1024);

   const unsafe = normalizePaymentBankSnapshot({
      ...legacy,
      acceptedProofTypes: ['text/plain'],
      maxProofBytes: HARD_MAX_PROOF_BYTES + 1,
   });
   assert.deepEqual(unsafe.acceptedProofTypes, [...acceptedProofTypes]);
   assert.equal(unsafe.maxProofBytes, HARD_MAX_PROOF_BYTES);
});

test('payment proof response dates are serialized before schema parsing', async () => {
   const serviceSource = await read('./eventPaymentService.ts');
   assert.match(
      serviceSource,
      /submittedAt:\s*proof\.submittedAt\.toISOString\(\)/,
   );
   assert.match(
      serviceSource,
      /reviewedAt:\s*proof\.reviewedAt\?\.toISOString\(\)\s*\?\?\s*null/,
   );
});

test('private upload responses never expose storage keys', async () => {
   const source = await read('./eventPaymentRepository.ts');
   const detailSelect = source.slice(
      source.indexOf('findDetail'),
      source.indexOf('createProof'),
   );
   assert.doesNotMatch(detailSelect, /storageKey: true/);
});

test('migration enforces one current submitted proof and server size limit', async () => {
   const migration = await read(
      '../../../prisma/migrations/20260819010000_event_payments_private_uploads/migration.sql',
   );
   assert.match(migration, /WHERE "status" = 'SUBMITTED'/);
   assert.match(migration, /<= 10485760/);
   assert.match(migration, /registration_payments_revision_check/);
   assert.match(migration, /private_uploads_sizeBytes_check/);
   assert.match(migration, /private_uploads_sha256_check/);
});

test('payment queue accepts roadmap search and bounded deterministic sorts', () => {
   const parsed = paymentQueueSchema.parse({
      search: 'REG-123',
      sort: 'expiresAt:desc',
   });
   assert.equal(parsed.search, 'REG-123');
   assert.equal(parsed.sort, 'expiresAt:desc');
   assert.equal(
      paymentQueueSchema.safeParse({ sort: 'amountMinor:desc' }).success,
      false,
   );
});

test('queue search is scoped to order identity and sorting has an id tie break', async () => {
   const source = await read('./eventPaymentRepository.ts');
   for (const field of ['orderNumber', 'name', 'email', 'nim'])
      assert.match(source, new RegExp(field));
   assert.match(source, /\{ id: sortDirection \}/);
});

test('proof submission and review use locked lifecycle CAS', async () => {
   const source = await read('./eventPaymentRepository.ts');
   assert.match(source, /FOR UPDATE/);
   assert.match(source, /status: 'PENDING_PAYMENT'/);
   assert.match(source, /revision: payment\.revision/);
   assert.match(source, /payment\.order\.status !== 'PAYMENT_REVIEW'/);
   assert.match(source, /status: 'SUBMITTED'/);
});

test('payment OpenAPI is explicit and participant parameter matches the route', async () => {
   const docs = await read('./eventPaymentDocs.ts');
   assert.doesNotMatch(docs, /z\.unknown\(\)|passthrough/);
   assert.match(docs, /event-registrations\/\{registrationId\}\/payment/);
   assert.match(docs, /ParticipantEventPaymentDetailV1/);
   assert.match(docs, /InternalEventPaymentQueueRowV1/);
   assert.doesNotMatch(docs, /storageKey|fileKey/);
});

test('free payment settings allow cleared bank and proof configuration', () => {
   const result = paymentSettingsSchema.safeParse({
      amountMinor: '0',
      currency: 'IDR',
      bankName: null,
      accountHolder: null,
      accountNumber: null,
      instructions: null,
      paymentDeadlineHours: 24,
      acceptedProofTypes: [],
      maxProofBytes: 10485760,
   });
   assert.equal(result.success, true);
});

test('paid payment settings require bank identity and a proof type', () => {
   const result = paymentSettingsSchema.safeParse({
      amountMinor: '10000',
      currency: 'IDR',
      bankName: null,
      accountHolder: null,
      accountNumber: null,
      instructions: null,
      paymentDeadlineHours: 24,
      acceptedProofTypes: [],
      maxProofBytes: 10485760,
   });
   assert.equal(result.success, false);
   if (result.success) return;
   assert.deepEqual(
      new Set(result.error.issues.map((issue) => issue.path[0])),
      new Set([
         'bankName',
         'accountHolder',
         'accountNumber',
         'acceptedProofTypes',
      ]),
   );
});

test('Phase 7 migration provisions payment permissions to Admin only', async () => {
   const migration = await read(
      '../../../prisma/migrations/20260819010000_event_payments_private_uploads/migration.sql',
   );
   assert.match(migration, /review_event_payments/);
   assert.match(migration, /view_payment_proofs/);
   assert.match(migration, /admin_creator/);
   assert.match(migration, /WHERE r\."roleName" = 'Admin'/);
   assert.doesNotMatch(migration, /CROSS JOIN "roles"/);
});

test('seed restricts every Phase 6 and Phase 7 permission to Admin', async () => {
   const seed = await read('../../../prisma/seed.ts');
   for (const permission of [
      'review_event_registrations',
      'view_event_answers',
      'review_event_payments',
      'view_payment_proofs',
   ]) {
      assert.match(seed, new RegExp(`'${permission}'`));
      assert.match(seed, new RegExp(`permissions\\.${permission}\\.id`));
   }
   assert.match(seed, /roleName !== 'Admin'/);
});
