import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const migrationPath = fileURLToPath(
   new URL(
      '../../../prisma/migrations/20260816000000_add_event_registration_v1_foundation/migration.sql',
      import.meta.url,
   ),
);
const migrationSql = readFileSync(migrationPath, 'utf8');
const reconciliationMigrationPath = fileURLToPath(
   new URL(
      '../../../prisma/migrations/20260817000000_reconcile_registration_scope_constraints/migration.sql',
      import.meta.url,
   ),
);
const reconciliationMigrationSql = readFileSync(
   reconciliationMigrationPath,
   'utf8',
);
const mvpReconciliationMigrationSql = readFileSync(
   fileURLToPath(
      new URL(
         '../../../prisma/migrations/20260817010000_add_free_registration_mvp_guards/migration.sql',
         import.meta.url,
      ),
   ),
   'utf8',
);
const migrationsDirectory = fileURLToPath(
   new URL('../../../prisma/migrations/', import.meta.url),
);

describe('event registration V1 migration', () => {
   it('is additive and preserves legacy registration tables and columns', () => {
      assert.doesNotMatch(migrationSql, /DROP\s+(?:TABLE|COLUMN|TYPE)/i);
      assert.doesNotMatch(migrationSql, /TRUNCATE/i);
      assert.match(migrationSql, /ALTER TABLE "registration_forms" ADD COLUMN/);
      assert.match(migrationSql, /ALTER TABLE "subevents" ADD COLUMN/);
   });

   it('creates the order, package, member, form, payment, and ticket foundation', () => {
      for (const table of [
         'ticket_packages',
         'registration_orders',
         'registration_order_members',
         'registration_capacity_holds',
         'registration_form_sections',
         'registration_form_assignments',
         'registration_form_submissions',
         'registration_payments',
         'registration_payment_proofs',
         'registration_refunds',
         'registration_invitations',
         'registration_waitlist_entries',
         'registration_tickets',
         'attendance_check_ins',
         'registration_status_history',
      ]) {
         assert.match(migrationSql, new RegExp(`CREATE TABLE "${table}"`));
      }
   });

   it('enforces package scope and active attendee uniqueness', () => {
      assert.match(migrationSql, /registration_orders_package_scope_fkey/);
      assert.match(migrationSql, /registration_order_members_order_scope_fkey/);
      assert.match(
         migrationSql,
         /registration_capacity_holds_order_scope_fkey/,
      );
      assert.match(migrationSql, /registration_tickets_member_scope_fkey/);
      assert.match(
         migrationSql,
         /registration_order_members_active_user_idx[\s\S]*WHERE "status" <> 'CANCELLED'/,
      );
   });

   it('protects positive capacities, prices, deadlines, and revisions', () => {
      assert.match(migrationSql, /subevents_registration_deadlines_check/);
      assert.match(migrationSql, /ticket_packages_values_check/);
      assert.match(migrationSql, /registration_orders_values_check/);
      assert.match(migrationSql, /registration_capacity_holds_quantity_check/);
      assert.match(
         migrationSql,
         /registration_form_submissions_revision_check/,
      );
      assert.match(migrationSql, /registration_payments_amount_check/);
   });

   it('preserves external links and existing native forms during backfill', () => {
      assert.match(
         migrationSql,
         /SET "registrationMode" = 'EXTERNAL'[\s\S]*"destinationUrl"/,
      );
      assert.match(
         migrationSql,
         /SET "registrationMode" = 'INTERNAL'[\s\S]*FROM "registration_forms"/,
      );
      assert.match(
         migrationSql,
         /SET "approvalMode" = 'AUTO_APPROVE'[\s\S]*"autoAcceptRegistration" = true/,
      );
   });

   it('uses partial indexes for lifecycle-dependent uniqueness', () => {
      assert.match(migrationSql, /form_question_options_active_value_idx/);
      assert.match(
         migrationSql,
         /registration_form_assignments_default_idx[\s\S]*"ticketPackageId" IS NULL/,
      );
      assert.match(
         migrationSql,
         /registration_form_submissions_buyer_revision_idx[\s\S]*"orderMemberId" IS NULL/,
      );
   });

   it('idempotently repairs generated drift without dropping data', () => {
      assert.doesNotMatch(
         reconciliationMigrationSql,
         /DROP\s+(?:TABLE|COLUMN|TYPE|CONSTRAINT|INDEX)/i,
      );
      assert.doesNotMatch(
         reconciliationMigrationSql,
         /TRUNCATE|DELETE\s+FROM/i,
      );
      assert.match(
         reconciliationMigrationSql,
         /CREATE UNIQUE INDEX IF NOT EXISTS "subevents_id_eventId_key"/,
      );
      for (const constraint of [
         'ticket_packages_subevent_event_fkey',
         'registration_orders_package_scope_fkey',
         'registration_order_members_order_scope_fkey',
         'registration_capacity_holds_order_scope_fkey',
         'registration_tickets_member_scope_fkey',
      ]) {
         assert.match(reconciliationMigrationSql, new RegExp(constraint));
      }
      assert.match(reconciliationMigrationSql, /NOT VALID/);
      assert.match(reconciliationMigrationSql, /VALIDATE CONSTRAINT/);
      assert.match(
         mvpReconciliationMigrationSql,
         /registration_forms_logicalKey_version_idx/,
      );
      assert.match(
         mvpReconciliationMigrationSql,
         /registration_form_sections_form_status_order_idx/,
      );
   });

   it('rejects future migrations that drop database-managed scope rules', () => {
      const protectedNames = [
         'subevents_id_eventId_key',
         'ticket_packages_id_eventId_subEventId_key',
         'registration_orders_id_eventId_subEventId_key',
         'registration_orders_id_subEventId_key',
         'registration_order_members_id_subEventId_key',
         'ticket_packages_subevent_event_fkey',
         'registration_orders_package_scope_fkey',
         'registration_order_members_order_scope_fkey',
         'registration_capacity_holds_order_scope_fkey',
         'registration_tickets_member_scope_fkey',
         'registration_forms_logicalKey_version_idx',
         'registration_form_sections_form_status_order_idx',
      ];
      const migrationFiles = readdirSync(migrationsDirectory, {
         withFileTypes: true,
      })
         .filter((entry) => entry.isDirectory())
         .map((entry) => `${migrationsDirectory}${entry.name}/migration.sql`);

      for (const file of migrationFiles) {
         if (file.includes('/20260816165023/')) continue;
         const sql = readFileSync(file, 'utf8');
         for (const name of protectedNames) {
            assert.doesNotMatch(
               sql,
               new RegExp(
                  `DROP\\s+(?:CONSTRAINT|INDEX)(?:\\s+IF\\s+EXISTS)?\\s+"${name}"`,
                  'i',
               ),
               `${file} must not drop database-managed scope rule ${name}`,
            );
         }
      }
   });
});
