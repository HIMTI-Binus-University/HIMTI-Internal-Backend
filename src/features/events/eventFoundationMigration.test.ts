import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const schema = readFileSync('prisma/schema.prisma', 'utf8');
const migration = readFileSync(
   'prisma/migrations/20260905000000_replace_registration_event_foundation/migration.sql',
   'utf8',
);
const paymentProofLimitMigration = readFileSync(
   'prisma/migrations/20260907000000_fix_event_payment_proof_limit/migration.sql',
   'utf8',
);
const paymentProofTypesMigration = readFileSync(
   'prisma/migrations/20260909120000_fix_payment_proof_types/migration.sql',
   'utf8',
);
const eventSoftDeleteMigration = readFileSync(
   'prisma/migrations/20260910160000_event_soft_delete/migration.sql',
   'utf8',
);
const seed = readFileSync('prisma/seed.ts', 'utf8');

test('final registration schema is Event-owned and excludes removed concepts', () => {
   for (const model of [
      'TicketPackage',
      'RegistrationForm',
      'RegistrationOrder',
      'RegistrationOrderMember',
      'RegistrationPaymentProof',
      'PaymentCorrectionTarget',
      'RegistrationTicket',
      'AttendanceCheckIn',
      'BundleMembershipAudit',
   ]) {
      assert.match(schema, new RegExp(`model ${model} \\{`));
   }
   assert.doesNotMatch(schema, /\bSubevent\b|subEventId|buyerUserId|isBuyer/);
});

test('replacement migration stays inside its deletion boundary', () => {
   assert.doesNotMatch(
      migration,
      /DROP\s+(?:TABLE|TYPE|FUNCTION)[^;]*CASCADE/i,
   );
   assert.doesNotMatch(
      migration,
      /ALTER TABLE "users"|DROP TABLE "private_uploads"/,
   );
   assert.match(migration, /Registration replacement boundary violated/);
   assert.match(migration, /DELETE FROM "events"/);
   assert.match(migration, /registration_members_one_active_per_event_user/);
   assert.match(migration, /registration_payment_proofs_one_current/);
   assert.doesNotMatch(migration, /INSERT INTO "permissions"/);
   for (const permission of [
      'manage_event_groups',
      'manage_event_registration',
      'manage_event_packages',
      'manage_event_registration_form',
   ]) {
      assert.match(seed, new RegExp(`'${permission}'`));
   }
});

test('payment proof limit migration backfills before enforcing the fixed value', () => {
   assert.ok(
      paymentProofLimitMigration.indexOf('UPDATE "events"') <
         paymentProofLimitMigration.indexOf('ADD CONSTRAINT'),
   );
   assert.match(
      paymentProofLimitMigration,
      /ALTER COLUMN "paymentProofMaxBytes" SET DEFAULT 1572864/,
   );
   assert.match(
      paymentProofLimitMigration,
      /CHECK \("paymentProofMaxBytes" = 1572864\)/,
   );
   assert.doesNotMatch(paymentProofLimitMigration, /DROP TABLE|DROP COLUMN/);
});

test('payment proof formats are fixed after existing events are normalized', () => {
   assert.ok(
      paymentProofTypesMigration.indexOf('UPDATE "events"') <
         paymentProofTypesMigration.indexOf('ADD CONSTRAINT'),
   );
   assert.match(
      paymentProofTypesMigration,
      /ARRAY\['image\/jpeg', 'image\/png', 'application\/pdf'\]/,
   );
   assert.doesNotMatch(paymentProofTypesMigration, /image\/webp/);
});

test('event soft deletion adds audit fields without deleting existing data', () => {
   assert.match(schema, /deletedAt\s+DateTime\?\s+@db\.Timestamp\(0\)/);
   assert.match(schema, /deletedBy\s+String\?\s+@db\.VarChar\(100\)/);
   assert.match(
      eventSoftDeleteMigration,
      /ADD COLUMN "deletedAt" TIMESTAMP\(0\)/,
   );
   assert.match(
      eventSoftDeleteMigration,
      /ADD COLUMN "deletedBy" VARCHAR\(100\)/,
   );
   assert.doesNotMatch(
      eventSoftDeleteMigration,
      /DELETE FROM|DROP TABLE|DROP COLUMN/,
   );
});
