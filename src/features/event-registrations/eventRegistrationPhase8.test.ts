import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const source = (path: string) =>
   readFileSync(fileURLToPath(new URL(path, import.meta.url)), 'utf8');
const repository = source('./eventRegistrationRepository.ts');
const migration = source(
   '../../../prisma/migrations/20260822010000_add_fixed_bundle_registration/migration.sql',
);
const invariantMigration = source(
   '../../../prisma/migrations/20260822020000_strengthen_registration_invitation_invariants/migration.sql',
);
const service = source('./eventRegistrationService.ts');
const paymentRepository = source('../event-payments/eventPaymentRepository.ts');

describe('fixed bundle registration invariants', () => {
   it('reserves exact seats and creates members only when claims succeed', () => {
      assert.match(repository, /quantity: selectedPackage\.seatCount/);
      assert.match(repository, /registrationOrderMember\.create/);
      assert.match(repository, /slotPosition/);
   });
   it('hashes secure tokens and lazily expires assembly orders', () => {
      assert.match(repository, /randomBytes\(32\)/);
      assert.match(repository, /createHash\('sha256'\)/);
      assert.match(repository, /Member assembly deadline expired/);
   });
   it('adds logical-target guards without editing prior migrations', () => {
      assert.match(migration, /buyer_logical_target_key/);
      assert.match(migration, /member_logical_target_key/);
      assert.match(migration, /registrationOrderId/);
   });
   it('locks creation and invitation decisions before capacity or lifecycle CAS', () => {
      assert.match(repository, /subevents[\s\S]*FOR UPDATE/);
      assert.match(repository, /decideInvitation[\s\S]*status: 'PENDING'/);
      assert.match(repository, /event\.status !== 'PUBLISHED'/);
      assert.match(repository, /registrationClosesAt/);
   });
   it('normalizes invitation identity and uses fragment token paths', () => {
      assert.match(repository, /normalizedEmail/);
      assert.match(service, /invitations#token=/);
      assert.doesNotMatch(service, /invitations\?token=/);
   });
   it('strengthens roster cardinality and invitation scope additively', () => {
      assert.match(invariantMigration, /order_scope_fkey/);
      assert.match(invariantMigration, /live_order_email_key/);
      assert.match(invariantMigration, /active_buyer_key/);
      assert.match(invariantMigration, /acceptance_metadata_check/);
      assert.match(invariantMigration, /active member count exceeds/);
   });
   it('does not let payment settings rewrite referenced package terms', () => {
      assert.match(
         paymentRepository,
         /_count: \{ select: \{ orders: true \} \}/,
      );
      assert.doesNotMatch(paymentRepository, /data: \{ status: 'INACTIVE' \}/);
      assert.doesNotMatch(paymentRepository, /update: \{[\s\S]*seatCount: 1/);
   });
});
