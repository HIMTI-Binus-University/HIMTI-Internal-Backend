import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const sql = readFileSync(
   fileURLToPath(
      new URL(
         '../../../prisma/migrations/20260817010000_add_free_registration_mvp_guards/migration.sql',
         import.meta.url,
      ),
   ),
   'utf8',
);
const assignmentScopeSql = readFileSync(
   fileURLToPath(
      new URL(
         '../../../prisma/migrations/20260817020000_add_registration_assignment_scope_guard/migration.sql',
         import.meta.url,
      ),
   ),
   'utf8',
);
const parentScopeSql = readFileSync(
   fileURLToPath(
      new URL(
         '../../../prisma/migrations/20260817030000_guard_assignment_parent_scope_updates/migration.sql',
         import.meta.url,
      ),
   ),
   'utf8',
);
const phase6Sql = readFileSync(
   fileURLToPath(
      new URL(
         '../../../prisma/migrations/20260817040000_add_registration_operations_phase6/migration.sql',
         import.meta.url,
      ),
   ),
   'utf8',
);
const assignmentSnapshotSql = readFileSync(
   fileURLToPath(
      new URL(
         '../../../prisma/migrations/20260818010000_snapshot_registration_form_assignments/migration.sql',
         import.meta.url,
      ),
   ),
   'utf8',
);

describe('free registration MVP migration', () => {
   it('restores drifted indexes and adds an active-hold guard', () => {
      assert.match(sql, /registration_forms_logicalKey_version_idx/);
      assert.match(sql, /registration_form_sections_form_status_order_idx/);
      assert.match(
         sql,
         /registration_capacity_holds_active_order_idx[\s\S]*WHERE "status" = 'ACTIVE'/,
      );
   });

   it('idempotently provisions free packages and default attendee assignments', () => {
      assert.match(sql, /FREE-INDIVIDUAL/);
      assert.match(sql, /EACH_ATTENDEE/);
      assert.match(sql, /ON CONFLICT/);
      assert.doesNotMatch(
         sql,
         /DROP\s+(?:TABLE|COLUMN|TYPE|INDEX|CONSTRAINT)/i,
      );
   });

   it('guards package and form assignment sub-event scope', () => {
      assert.match(assignmentScopeSql, /enforce_registration_assignment_scope/);
      assert.match(
         assignmentScopeSql,
         /form_sub_event_id <> package_sub_event_id/,
      );
      assert.match(assignmentScopeSql, /BEFORE INSERT OR UPDATE/);
      assert.doesNotMatch(
         assignmentScopeSql,
         /DROP\s+(?:TABLE|COLUMN|TYPE|TRIGGER)/i,
      );
   });

   it('forbids parent sub-event moves that invalidate assignments', () => {
      assert.match(parentScopeSql, /forbid_assigned_form_subevent_move/);
      assert.match(parentScopeSql, /forbid_assigned_package_subevent_move/);
      assert.match(parentScopeSql, /BEFORE UPDATE OF "subEventId"/);
      assert.match(parentScopeSql, /"ticketPackageId" IS NOT NULL/);
      assert.doesNotMatch(parentScopeSql, /DROP\s/i);
   });

   it('adds Phase 6 CAS and permissions without broad grants', () => {
      assert.match(phase6Sql, /ADD COLUMN "revision"/);
      assert.match(phase6Sql, /registration_orders_subEventId_status/);
      assert.match(phase6Sql, /review_event_registrations/);
      assert.match(phase6Sql, /view_event_answers/);
      assert.match(phase6Sql, /"roleName" = 'Admin'/);
      assert.doesNotMatch(phase6Sql, /DROP\s/i);
   });

   it('additively backfills immutable assignment metadata', () => {
      assert.match(assignmentSnapshotSql, /ADD COLUMN "assignmentAudience"/);
      assert.match(assignmentSnapshotSql, /ROW_NUMBER\(\) OVER/);
      assert.match(
         assignmentSnapshotSql,
         /"orderMemberId" IS NULL THEN 'BUYER'/,
      );
      assert.match(
         assignmentSnapshotSql,
         /COALESCE\(matched\."isRequired", TRUE\)/,
      );
      assert.match(assignmentSnapshotSql, /SET NOT NULL/);
      assert.match(assignmentSnapshotSql, /assignment_order_check/);
      assert.doesNotMatch(assignmentSnapshotSql, /DROP\s/i);
   });

   it('repairs published forms and only empty active draft submissions', () => {
      assert.match(
         assignmentSnapshotSql,
         /INSERT INTO "registration_form_assignments"[\s\S]*form\."status" = 'PUBLISHED'[\s\S]*form\."stage" = 'REGISTRATION'/,
      );
      assert.match(assignmentSnapshotSql, /'repair-default-' \|\| form\."id"/);
      assert.match(assignmentSnapshotSql, /ON CONFLICT DO NOTHING/);
      assert.match(
         assignmentSnapshotSql,
         /orders\."status" = 'DRAFT'[\s\S]*NOT EXISTS[\s\S]*"registration_form_submissions"/,
      );
      assert.match(
         assignmentSnapshotSql,
         /package_override\."ticketPackageId" = draft\.package_id/,
      );
      assert.match(assignmentSnapshotSql, /assignment\."opensAt"/);
      assert.match(assignmentSnapshotSql, /assignment\."closesAt"/);
      assert.match(assignmentSnapshotSql, /md5\(applicable\.order_id/);
      assert.match(
         assignmentSnapshotSql,
         /CASE WHEN applicable\."audience" = 'BUYER' THEN NULL ELSE applicable\.buyer_member_id END/,
      );
   });
});
