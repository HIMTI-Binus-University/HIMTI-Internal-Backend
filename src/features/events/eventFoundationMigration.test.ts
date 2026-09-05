import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const schema = readFileSync('prisma/schema.prisma', 'utf8');
const migration = readFileSync(
   'prisma/migrations/20260905000000_replace_registration_event_foundation/migration.sql',
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
