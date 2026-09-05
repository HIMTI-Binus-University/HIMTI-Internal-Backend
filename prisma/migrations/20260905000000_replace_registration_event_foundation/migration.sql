-- Abort if a table outside the approved replacement boundary references it.
DO $$
DECLARE unexpected_fk text;
BEGIN
  SELECT string_agg(format('%I.%I', n.nspname, c.relname), ', ')
  INTO unexpected_fk
  FROM pg_constraint fk
  JOIN pg_class c ON c.oid = fk.conrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  JOIN pg_class target ON target.oid = fk.confrelid
  WHERE fk.contype = 'f'
    AND n.nspname = 'public'
    AND target.relname = ANY (ARRAY['events','subevents','event_committees','event_has_participants','registration_forms','registration_form_sections','form_questions','form_question_options','registration_responses','form_answers','ticket_packages','registration_orders','registration_order_members','registration_capacity_holds','registration_form_assignments','registration_form_submissions','post_registration_form_assignments','registration_form_submission_answers','registration_form_selected_options','registration_payments','registration_payment_proofs','registration_payment_history','registration_refunds','registration_invitations','registration_waitlist_entries','registration_tickets','attendance_check_ins','attendance_audits','registration_status_history'])
    AND c.relname <> ALL (ARRAY['events','subevents','event_committees','event_has_participants','registration_forms','registration_form_sections','form_questions','form_question_options','registration_responses','form_answers','ticket_packages','registration_orders','registration_order_members','registration_capacity_holds','registration_form_assignments','registration_form_submissions','post_registration_form_assignments','registration_form_submission_answers','registration_form_selected_options','registration_payments','registration_payment_proofs','registration_payment_history','registration_refunds','registration_invitations','registration_waitlist_entries','registration_tickets','attendance_check_ins','attendance_audits','registration_status_history']);
  IF unexpected_fk IS NOT NULL THEN
    RAISE EXCEPTION 'Registration replacement boundary violated by foreign keys from: %', unexpected_fk;
  END IF;
END $$;

-- Raw objects from prior migrations are invisible to Prisma's schema diff.
-- Remove each dependency explicitly before replacing its columns.
DROP TRIGGER IF EXISTS "registration_forms_assignment_scope_update_guard" ON "registration_forms";
DROP TRIGGER IF EXISTS "ticket_packages_assignment_scope_update_guard" ON "ticket_packages";
DROP TRIGGER IF EXISTS "registration_order_members_roster_invariants" ON "registration_order_members";
DROP TRIGGER IF EXISTS "registration_invitations_roster_invariants" ON "registration_invitations";
DROP TRIGGER IF EXISTS "registration_form_assignment_routing_guard" ON "registration_form_assignments";
DROP TRIGGER IF EXISTS "registration_form_assignments_scope_guard" ON "registration_form_assignments";
DROP TRIGGER IF EXISTS "post_registration_assignment_scope_guard" ON "post_registration_form_assignments";
DROP TRIGGER IF EXISTS "post_registration_assignment_immutable_guard" ON "post_registration_form_assignments";
DROP TRIGGER IF EXISTS "post_registration_response_link_guard" ON "post_registration_form_assignments";
DROP FUNCTION IF EXISTS "forbid_assigned_form_subevent_move"();
DROP FUNCTION IF EXISTS "forbid_assigned_package_subevent_move"();
DROP FUNCTION IF EXISTS "enforce_registration_roster_invariants"();
DROP FUNCTION IF EXISTS "enforce_registration_assignment_routing"();
DROP FUNCTION IF EXISTS "enforce_registration_assignment_scope"();
DROP FUNCTION IF EXISTS "enforce_post_registration_assignment_scope"();
DROP FUNCTION IF EXISTS "enforce_post_registration_snapshot_immutable"();
DROP FUNCTION IF EXISTS "enforce_post_registration_response_link"();

DROP INDEX IF EXISTS "registration_forms_one_published_logical_version_idx";
DROP INDEX IF EXISTS "registration_forms_one_published_registration_per_subevent_idx";
DROP INDEX IF EXISTS "form_questions_active_field_key_idx";
DROP INDEX IF EXISTS "registration_order_members_active_buyer_key";
DROP INDEX IF EXISTS "registration_order_members_active_user_idx";
DROP INDEX IF EXISTS "registration_capacity_holds_active_order_idx";
DROP INDEX IF EXISTS "registration_payment_proofs_one_submitted_idx";
DROP INDEX IF EXISTS "attendance_check_ins_one_active_ticket_key";

ALTER TABLE "registration_forms" DROP CONSTRAINT IF EXISTS "registration_forms_configuration_check";
ALTER TABLE "registration_forms" DROP CONSTRAINT IF EXISTS "registration_forms_revision_check";
ALTER TABLE "registration_order_members" DROP CONSTRAINT IF EXISTS "registration_order_members_buyer_position_check";
ALTER TABLE "registration_order_members" DROP CONSTRAINT IF EXISTS "registration_order_members_position_check";
ALTER TABLE "registration_orders" DROP CONSTRAINT IF EXISTS "registration_orders_seat_count_check";
ALTER TABLE "registration_orders" DROP CONSTRAINT IF EXISTS "registration_orders_values_check";
ALTER TABLE "registration_orders" DROP CONSTRAINT IF EXISTS "registration_orders_amounts_check";
ALTER TABLE "registration_capacity_holds" DROP CONSTRAINT IF EXISTS "registration_capacity_holds_quantity_check";
ALTER TABLE "ticket_packages" DROP CONSTRAINT IF EXISTS "ticket_packages_seat_count_check";
ALTER TABLE "ticket_packages" DROP CONSTRAINT IF EXISTS "ticket_packages_price_check";
ALTER TABLE "ticket_packages" DROP CONSTRAINT IF EXISTS "ticket_packages_sales_window_check";
ALTER TABLE "registration_form_submissions" DROP CONSTRAINT IF EXISTS "registration_form_submissions_correction_check";
ALTER TABLE "registration_payments" DROP CONSTRAINT IF EXISTS "registration_payments_amount_check";
ALTER TABLE "attendance_check_ins" DROP CONSTRAINT IF EXISTS "attendance_check_ins_checkout_after_checkin_check";
ALTER TABLE "attendance_check_ins" DROP CONSTRAINT IF EXISTS "attendance_check_ins_revision_positive_check";
ALTER TABLE "attendance_check_ins" DROP CONSTRAINT IF EXISTS "attendance_check_ins_void_reason_check";
ALTER TABLE "attendance_audits" DROP CONSTRAINT IF EXISTS "attendance_audits_action_check";
ALTER TABLE "attendance_audits" DROP CONSTRAINT IF EXISTS "attendance_audits_revision_positive_check";

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "EventGroupStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "OrganizerRole" AS ENUM ('MANAGER', 'ORGANIZER');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "FormQuestionType" AS ENUM ('TEXT', 'TEXTAREA', 'NUMBER', 'DATE', 'SELECT', 'RADIO', 'CHECKBOX', 'FILE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "RegistrationMemberStatus" AS ENUM ('ACTIVE', 'LEFT', 'REMOVED', 'LOCKED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "RegistrationPaymentStatus" AS ENUM ('COLLECTING', 'REVIEW', 'VERIFIED', 'REJECTED', 'EXPIRED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "RegistrationProofStatus" AS ENUM ('CURRENT', 'SUPERSEDED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "RegistrationTicketStatus" AS ENUM ('ACTIVE', 'USED', 'REVOKED', 'EXPIRED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "BundleMembershipAction" AS ENUM ('JOINED', 'LEFT', 'REMOVED_BY_ORGANIZER');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AlterEnum
BEGIN;
CREATE TYPE "FormSubmissionStatus_new" AS ENUM ('DRAFT', 'SUBMITTED', 'LOCKED');
ALTER TABLE "public"."registration_form_submissions" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "registration_form_submissions" ALTER COLUMN "status" TYPE "FormSubmissionStatus_new" USING ("status"::text::"FormSubmissionStatus_new");
ALTER TYPE "FormSubmissionStatus" RENAME TO "FormSubmissionStatus_old";
ALTER TYPE "FormSubmissionStatus_new" RENAME TO "FormSubmissionStatus";
DROP TYPE "public"."FormSubmissionStatus_old";
ALTER TABLE "registration_form_submissions" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "RegistrationOrderStatus_new" AS ENUM ('ASSEMBLING', 'PENDING_PAYMENT', 'PAYMENT_REVIEW', 'CONFIRMED', 'EXPIRED', 'CANCELLED', 'REJECTED');
ALTER TABLE "public"."registration_orders" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "registration_orders" ALTER COLUMN "status" TYPE "RegistrationOrderStatus_new" USING ("status"::text::"RegistrationOrderStatus_new");
ALTER TYPE "RegistrationOrderStatus" RENAME TO "RegistrationOrderStatus_old";
ALTER TYPE "RegistrationOrderStatus_new" RENAME TO "RegistrationOrderStatus";
DROP TYPE "public"."RegistrationOrderStatus_old";
ALTER TABLE "registration_orders" ALTER COLUMN "status" SET DEFAULT 'ASSEMBLING';
COMMIT;

-- DropForeignKey
ALTER TABLE "attendance_audits" DROP CONSTRAINT "attendance_audits_subEventId_fkey";

-- DropForeignKey
ALTER TABLE "attendance_check_ins" DROP CONSTRAINT "attendance_check_ins_subEventId_fkey";

-- DropForeignKey
ALTER TABLE "event_committees" DROP CONSTRAINT "event_committees_eventId_fkey";

-- DropForeignKey
ALTER TABLE "event_committees" DROP CONSTRAINT "event_committees_userId_fkey";

-- DropForeignKey
ALTER TABLE "event_has_participants" DROP CONSTRAINT "event_has_participants_approvedBy_fkey";

-- DropForeignKey
ALTER TABLE "event_has_participants" DROP CONSTRAINT "event_has_participants_eventId_fkey";

-- DropForeignKey
ALTER TABLE "event_has_participants" DROP CONSTRAINT "event_has_participants_eventModeId_fkey";

-- DropForeignKey
ALTER TABLE "event_has_participants" DROP CONSTRAINT "event_has_participants_paymentVerifiedBy_fkey";

-- DropForeignKey
ALTER TABLE "event_has_participants" DROP CONSTRAINT "event_has_participants_userId_fkey";

-- DropForeignKey
ALTER TABLE "form_answers" DROP CONSTRAINT "form_answers_formQuestionId_fkey";

-- DropForeignKey
ALTER TABLE "form_answers" DROP CONSTRAINT "form_answers_registrationResponseId_fkey";

-- DropForeignKey
ALTER TABLE "form_question_options" DROP CONSTRAINT "form_question_options_createdBy_fkey";

-- DropForeignKey
ALTER TABLE "form_question_options" DROP CONSTRAINT "form_question_options_formQuestionId_fkey";

-- DropForeignKey
ALTER TABLE "form_question_options" DROP CONSTRAINT "form_question_options_updatedBy_fkey";

-- DropForeignKey
ALTER TABLE "form_questions" DROP CONSTRAINT "form_questions_createdBy_fkey";

-- DropForeignKey
ALTER TABLE "form_questions" DROP CONSTRAINT "form_questions_registrationFormId_fkey";

-- DropForeignKey
ALTER TABLE "form_questions" DROP CONSTRAINT "form_questions_sectionId_fkey";

-- DropForeignKey
ALTER TABLE "form_questions" DROP CONSTRAINT "form_questions_updatedBy_fkey";

-- DropForeignKey
ALTER TABLE "post_registration_form_assignments" DROP CONSTRAINT "post_registration_form_assignments_form_fkey";

-- DropForeignKey
ALTER TABLE "post_registration_form_assignments" DROP CONSTRAINT "post_registration_form_assignments_member_fkey";

-- DropForeignKey
ALTER TABLE "post_registration_form_assignments" DROP CONSTRAINT "post_registration_form_assignments_order_fkey";

-- DropForeignKey
ALTER TABLE "post_registration_form_assignments" DROP CONSTRAINT "post_registration_form_assignments_reopener_fkey";

-- DropForeignKey
ALTER TABLE "post_registration_form_assignments" DROP CONSTRAINT "post_registration_form_assignments_response_fkey";

-- DropForeignKey
ALTER TABLE "registration_capacity_holds" DROP CONSTRAINT "registration_capacity_holds_subEventId_fkey";

-- DropForeignKey
ALTER TABLE "registration_form_assignments" DROP CONSTRAINT "registration_form_assignments_registrationFormId_fkey";

-- DropForeignKey
ALTER TABLE "registration_form_assignments" DROP CONSTRAINT "registration_form_assignments_ticketPackageId_fkey";

-- DropForeignKey
ALTER TABLE "registration_form_submissions" DROP CONSTRAINT "registration_form_submissions_orderMemberId_fkey";

-- DropForeignKey
ALTER TABLE "registration_form_submissions" DROP CONSTRAINT "registration_form_submissions_registrationOrderId_fkey";

-- DropForeignKey
ALTER TABLE "registration_forms" DROP CONSTRAINT "registration_forms_createdBy_fkey";

-- DropForeignKey
ALTER TABLE "registration_forms" DROP CONSTRAINT "registration_forms_deletedBy_fkey";

-- DropForeignKey
ALTER TABLE "registration_forms" DROP CONSTRAINT "registration_forms_subEventId_fkey";

-- DropForeignKey
ALTER TABLE "registration_forms" DROP CONSTRAINT "registration_forms_supersedesId_fkey";

-- DropForeignKey
ALTER TABLE "registration_forms" DROP CONSTRAINT "registration_forms_updatedBy_fkey";

-- DropForeignKey
ALTER TABLE "registration_invitations" DROP CONSTRAINT "registration_invitations_claimedBy_fkey";

-- DropForeignKey
ALTER TABLE "registration_invitations" DROP CONSTRAINT "registration_invitations_eventId_fkey";

-- DropForeignKey
ALTER TABLE "registration_invitations" DROP CONSTRAINT "registration_invitations_orderMemberId_fkey";

-- DropForeignKey
ALTER TABLE "registration_invitations" DROP CONSTRAINT "registration_invitations_order_scope_fkey";

-- DropForeignKey
ALTER TABLE "registration_invitations" DROP CONSTRAINT "registration_invitations_sentBy_fkey";

-- DropForeignKey
ALTER TABLE "registration_invitations" DROP CONSTRAINT "registration_invitations_subEventId_fkey";

-- DropForeignKey
ALTER TABLE "registration_order_members" DROP CONSTRAINT "registration_order_members_subEventId_fkey";

-- DropForeignKey
ALTER TABLE "registration_orders" DROP CONSTRAINT "registration_orders_buyerUserId_fkey";

-- DropForeignKey
ALTER TABLE "registration_orders" DROP CONSTRAINT "registration_orders_subEventId_fkey";

-- DropForeignKey
ALTER TABLE "registration_orders" DROP CONSTRAINT "registration_orders_ticketPackageId_fkey";

-- DropForeignKey
ALTER TABLE "registration_payment_history" DROP CONSTRAINT "registration_payment_history_actorUserId_fkey";

-- DropForeignKey
ALTER TABLE "registration_payment_history" DROP CONSTRAINT "registration_payment_history_paymentId_fkey";

-- DropForeignKey
ALTER TABLE "registration_payment_proofs" DROP CONSTRAINT "registration_payment_proofs_reviewedBy_fkey";

-- DropForeignKey
ALTER TABLE "registration_payments" DROP CONSTRAINT "registration_payments_reviewedBy_fkey";

-- DropForeignKey
ALTER TABLE "registration_refunds" DROP CONSTRAINT "registration_refunds_paymentId_fkey";

-- DropForeignKey
ALTER TABLE "registration_refunds" DROP CONSTRAINT "registration_refunds_processedBy_fkey";

-- DropForeignKey
ALTER TABLE "registration_refunds" DROP CONSTRAINT "registration_refunds_registrationOrderId_fkey";

-- DropForeignKey
ALTER TABLE "registration_responses" DROP CONSTRAINT "registration_responses_eventHasParticipantId_fkey";

-- DropForeignKey
ALTER TABLE "registration_responses" DROP CONSTRAINT "registration_responses_registrationFormId_fkey";

-- DropForeignKey
ALTER TABLE "registration_responses" DROP CONSTRAINT "registration_responses_userId_fkey";

-- DropForeignKey
ALTER TABLE "registration_tickets" DROP CONSTRAINT "registration_tickets_subEventId_fkey";

-- DropForeignKey
ALTER TABLE "registration_waitlist_entries" DROP CONSTRAINT "registration_waitlist_entries_registrationOrderId_fkey";

-- DropForeignKey
ALTER TABLE "registration_waitlist_entries" DROP CONSTRAINT "registration_waitlist_entries_subEventId_fkey";

-- DropForeignKey
ALTER TABLE "registration_waitlist_entries" DROP CONSTRAINT "registration_waitlist_entries_ticketPackageId_fkey";

-- DropForeignKey
ALTER TABLE "subevents" DROP CONSTRAINT "subevents_createdBy_fkey";

-- DropForeignKey
ALTER TABLE "subevents" DROP CONSTRAINT "subevents_eventId_fkey";

-- DropForeignKey
ALTER TABLE "subevents" DROP CONSTRAINT "subevents_updatedBy_fkey";

-- DropForeignKey
ALTER TABLE "ticket_packages" DROP CONSTRAINT "ticket_packages_subEventId_fkey";

-- Drop raw composite scope foreign keys before their supporting unique indexes.
ALTER TABLE "ticket_packages" DROP CONSTRAINT IF EXISTS "ticket_packages_subevent_event_fkey";
ALTER TABLE "registration_orders" DROP CONSTRAINT IF EXISTS "registration_orders_package_scope_fkey";
ALTER TABLE "registration_order_members" DROP CONSTRAINT IF EXISTS "registration_order_members_order_scope_fkey";
ALTER TABLE "registration_capacity_holds" DROP CONSTRAINT IF EXISTS "registration_capacity_holds_order_scope_fkey";
ALTER TABLE "registration_tickets" DROP CONSTRAINT IF EXISTS "registration_tickets_member_scope_fkey";

-- DropIndex
DROP INDEX "attendance_audits_subEventId_createdAt_idx";

-- DropIndex
DROP INDEX "attendance_check_ins_operatorUserId_checkedInAt_idx";

-- DropIndex
DROP INDEX "attendance_check_ins_subEventId_checkedInAt_idx";

-- DropIndex
DROP INDEX "attendance_check_ins_ticketId_key";

-- DropIndex
DROP INDEX "form_question_options_formQuestionId_orderIndex_idx";

-- DropIndex
DROP INDEX "form_questions_registrationFormId_sectionId_orderIndex_idx";

-- DropIndex
DROP INDEX "registration_capacity_holds_registrationOrderId_status_idx";

-- DropIndex
DROP INDEX "registration_capacity_holds_subEventId_status_expiresAt_idx";

-- DropIndex
DROP INDEX "registration_form_sections_form_status_order_idx";

-- DropIndex
DROP INDEX "registration_form_selected_options_optionId_idx";

-- DropIndex
DROP INDEX "registration_form_submission_answers_formQuestionId_idx";

-- DropIndex
DROP INDEX "registration_form_submissions_orderMemberId_status_idx";

-- DropIndex
DROP INDEX "registration_form_submissions_order_assignment_order_idx";

-- DropIndex
DROP INDEX "registration_forms_deletedBy_idx";

-- DropIndex
DROP INDEX "registration_forms_logicalKey_version_idx";

-- DropIndex
DROP INDEX "registration_forms_subEventId_logicalKey_version_key";

-- DropIndex
DROP INDEX "registration_forms_subEventId_stage_status_idx";

-- DropIndex
DROP INDEX "registration_order_members_id_subEventId_key";

-- DropIndex
DROP INDEX "registration_order_members_userId_status_idx";

-- DropIndex
DROP INDEX "registration_orders_buyerUserId_createdAt_idx";

-- DropIndex
DROP INDEX "registration_orders_buyerUserId_subEventId_status_idx";

-- DropIndex
DROP INDEX "registration_orders_id_eventId_subEventId_key";

-- DropIndex
DROP INDEX "registration_orders_id_subEventId_key";

-- DropIndex
DROP INDEX "registration_orders_idempotencyKey_key";

-- DropIndex
DROP INDEX "registration_orders_paymentDeadlineAt_status_idx";

-- DropIndex
DROP INDEX "registration_orders_subEventId_status_createdAt_idx";

-- DropIndex
DROP INDEX "registration_orders_subEventId_status_submittedAt_id_idx";

-- DropIndex
DROP INDEX "registration_payment_proofs_paymentId_status_submittedAt_idx";

-- DropIndex
DROP INDEX "registration_payment_proofs_status_submittedAt_idx";

-- DropIndex
DROP INDEX "registration_payments_expiresAt_status_idx";

-- DropIndex
DROP INDEX "registration_payments_status_createdAt_idx";

-- DropIndex
DROP INDEX "registration_status_history_entityType_entityId_createdAt_idx";

-- DropIndex
DROP INDEX "registration_tickets_expiresAt_status_idx";

-- DropIndex
DROP INDEX "registration_tickets_subEventId_status_idx";

-- DropIndex
DROP INDEX "ticket_packages_eventId_status_idx";

-- DropIndex
DROP INDEX "ticket_packages_id_eventId_subEventId_key";

-- DropIndex
DROP INDEX "ticket_packages_subEventId_code_key";

-- DropIndex
DROP INDEX "ticket_packages_subEventId_status_salesStartAt_salesEndAt_idx";

-- AlterTable
-- All experimental Event rows are approved disposable. Foreign keys have been
-- removed above, so clear every reused table before adding target NOT NULL fields.
DELETE FROM "attendance_audits";
DELETE FROM "attendance_check_ins";
DELETE FROM "registration_form_selected_options";
DELETE FROM "registration_form_submission_answers";
DELETE FROM "registration_form_submissions";
DELETE FROM "registration_payment_proofs";
DELETE FROM "registration_payment_history";
DELETE FROM "registration_payments";
DELETE FROM "registration_capacity_holds";
DELETE FROM "registration_status_history";
DELETE FROM "registration_tickets";
DELETE FROM "registration_order_members";
DELETE FROM "registration_orders";
DELETE FROM "form_question_options";
DELETE FROM "form_questions";
DELETE FROM "registration_form_sections";
DELETE FROM "registration_forms";
DELETE FROM "ticket_packages";
DELETE FROM "subevents";
DELETE FROM "event_committees";
DELETE FROM "event_has_participants";
DELETE FROM "events";

ALTER TABLE "attendance_audits" DROP COLUMN "revision",
DROP COLUMN "subEventId";

-- AlterTable
ALTER TABLE "attendance_check_ins" DROP COLUMN "correctionReason",
DROP COLUMN "source",
DROP COLUMN "subEventId",
DROP COLUMN "voidReason",
DROP COLUMN "voidedBy",
ADD COLUMN     "eventId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "events" ADD COLUMN     "attendanceCheckoutEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "attendanceEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "cancellationClosesAt" TIMESTAMP(3),
ADD COLUMN     "capacity" INTEGER,
ADD COLUMN     "endsAt" TIMESTAMP(3),
ADD COLUMN     "eventGroupId" TEXT,
ADD COLUMN     "internalDescription" TEXT,
ADD COLUMN     "isRegistrationOpen" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "locationAddress" TEXT,
ADD COLUMN     "locationName" VARCHAR(255),
ADD COLUMN     "locationUrl" TEXT,
ADD COLUMN     "paymentAccountHolder" VARCHAR(150),
ADD COLUMN     "paymentAccountNumber" VARCHAR(100),
ADD COLUMN     "paymentBankName" VARCHAR(100),
ADD COLUMN     "paymentCurrency" CHAR(3) NOT NULL DEFAULT 'IDR',
ADD COLUMN     "paymentInstructions" TEXT,
ADD COLUMN     "paymentProofMaxBytes" INTEGER NOT NULL DEFAULT 10485760,
ADD COLUMN     "paymentProofTypes" TEXT[] DEFAULT ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']::TEXT[],
ADD COLUMN     "primaryColor" VARCHAR(20),
ADD COLUMN     "registrationClosesAt" TIMESTAMP(3),
ADD COLUMN     "registrationOpensAt" TIMESTAMP(3),
ADD COLUMN     "secondaryColor" VARCHAR(20),
ADD COLUMN     "startsAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "form_question_options" DROP COLUMN "createdAt",
DROP COLUMN "createdBy",
DROP COLUMN "formQuestionId",
DROP COLUMN "isActive",
DROP COLUMN "updatedAt",
DROP COLUMN "updatedBy",
ADD COLUMN     "questionId" TEXT NOT NULL,
ALTER COLUMN "orderIndex" DROP DEFAULT;

-- AlterTable
ALTER TABLE "form_questions" DROP COLUMN "createdAt",
DROP COLUMN "createdBy",
DROP COLUMN "fieldType",
DROP COLUMN "helpText",
DROP COLUMN "registrationFormId",
DROP COLUMN "status",
DROP COLUMN "updatedAt",
DROP COLUMN "updatedBy",
ADD COLUMN     "type" "FormQuestionType" NOT NULL,
ALTER COLUMN "orderIndex" DROP DEFAULT,
ALTER COLUMN "sectionId" SET NOT NULL;

-- AlterTable
ALTER TABLE "registration_capacity_holds" DROP COLUMN "subEventId",
DROP COLUMN "updatedAt",
ADD COLUMN     "eventId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "registration_form_sections" DROP COLUMN "createdAt",
DROP COLUMN "status",
DROP COLUMN "updatedAt";

-- AlterTable
ALTER TABLE "registration_form_submission_answers" DROP COLUMN "fileUrl";

-- AlterTable
ALTER TABLE "registration_form_submissions" DROP COLUMN "assignmentAudience",
DROP COLUMN "assignmentOrderIndex",
DROP COLUMN "assignmentRequired",
DROP COLUMN "correctionDeadlineAt",
DROP COLUMN "correctionReason",
DROP COLUMN "responseIdempotencyFingerprint",
DROP COLUMN "responseIdempotencyKey",
DROP COLUMN "revision",
ADD COLUMN     "formVersion" INTEGER NOT NULL,
ALTER COLUMN "orderMemberId" SET NOT NULL;

-- AlterTable
ALTER TABLE "registration_forms" DROP COLUMN "audience",
DROP COLUMN "blocksCheckIn",
DROP COLUMN "closesAt",
DROP COLUMN "createdBy",
DROP COLUMN "deletedAt",
DROP COLUMN "deletedBy",
DROP COLUMN "isRequired",
DROP COLUMN "logicalKey",
DROP COLUMN "opensAt",
DROP COLUMN "orderIndex",
DROP COLUMN "revision",
DROP COLUMN "stage",
DROP COLUMN "subEventId",
DROP COLUMN "supersedesId",
DROP COLUMN "updatedBy",
ADD COLUMN     "eventId" TEXT NOT NULL,
ALTER COLUMN "name" DROP DEFAULT;

-- AlterTable
ALTER TABLE "registration_order_members" DROP COLUMN "acceptedAt",
DROP COLUMN "invitedAt",
DROP COLUMN "isBuyer",
DROP COLUMN "readyAt",
DROP COLUMN "subEventId",
ADD COLUMN     "eventId" TEXT NOT NULL,
ADD COLUMN     "snapshotAt" TIMESTAMP(3),
ADD COLUMN     "snapshotEmail" VARCHAR(100),
ADD COLUMN     "snapshotName" VARCHAR(255),
ADD COLUMN     "snapshotNim" VARCHAR(50),
ADD COLUMN     "snapshotOutlookEmail" VARCHAR(100),
ADD COLUMN     "snapshotPhoneNumber" VARCHAR(20),
ADD COLUMN     "snapshotRegion" VARCHAR(255),
ADD COLUMN     "snapshotStudyProgram" VARCHAR(255),
ADD COLUMN     "snapshotUniversity" VARCHAR(255),
DROP COLUMN "status",
ADD COLUMN     "status" "RegistrationMemberStatus" NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "registration_orders" DROP COLUMN "approvedAt",
DROP COLUMN "buyerUserId",
DROP COLUMN "cancellationReason",
DROP COLUMN "correctionDeadlineAt",
DROP COLUMN "idempotencyFingerprint",
DROP COLUMN "idempotencyKey",
DROP COLUMN "memberDeadlineAt",
DROP COLUMN "subEventId",
DROP COLUMN "submittedAt",
ADD COLUMN     "bundleCodeHash" VARCHAR(64),
ADD COLUMN     "confirmedAt" TIMESTAMP(3),
ALTER COLUMN "status" SET DEFAULT 'ASSEMBLING',
ALTER COLUMN "currency" DROP DEFAULT;

-- AlterTable
ALTER TABLE "registration_payment_proofs" DROP COLUMN "fileKey",
DROP COLUMN "reviewReason",
DROP COLUMN "reviewedAt",
DROP COLUMN "reviewedBy",
ADD COLUMN     "orderMemberId" TEXT NOT NULL,
ADD COLUMN     "supersededAt" TIMESTAMP(3),
ADD COLUMN     "uploadedByUserId" TEXT NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" "RegistrationProofStatus" NOT NULL DEFAULT 'CURRENT',
ALTER COLUMN "uploadId" SET NOT NULL;

-- AlterTable
ALTER TABLE "registration_payments" DROP COLUMN "rejectionReason",
DROP COLUMN "reviewedBy",
DROP COLUMN "revision",
DROP COLUMN "submittedAt",
DROP COLUMN "verifiedAt",
DROP COLUMN "status",
ADD COLUMN     "status" "RegistrationPaymentStatus" NOT NULL DEFAULT 'COLLECTING',
ALTER COLUMN "currency" DROP DEFAULT;

-- AlterTable
ALTER TABLE "registration_status_history" DROP COLUMN "metadata",
ALTER COLUMN "entityType" SET DATA TYPE VARCHAR(50),
ALTER COLUMN "fromStatus" SET DATA TYPE VARCHAR(50),
ALTER COLUMN "toStatus" SET DATA TYPE VARCHAR(50);

-- AlterTable
ALTER TABLE "registration_tickets" DROP COLUMN "createdAt",
DROP COLUMN "keyVersion",
DROP COLUMN "subEventId",
DROP COLUMN "tokenAuthTag",
DROP COLUMN "tokenCiphertext",
DROP COLUMN "tokenIv",
DROP COLUMN "updatedAt",
ADD COLUMN     "eventId" TEXT NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" "RegistrationTicketStatus" NOT NULL DEFAULT 'ACTIVE',
ALTER COLUMN "issuedAt" SET NOT NULL,
ALTER COLUMN "issuedAt" SET DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "issuedAt" SET DATA TYPE TIMESTAMP(0);

-- AlterTable
ALTER TABLE "ticket_packages" DROP COLUMN "revision",
DROP COLUMN "subEventId";

-- DropTable
DROP TABLE "event_committees";

-- DropTable
DROP TABLE "event_has_participants";

-- DropTable
DROP TABLE "form_answers";

-- DropTable
DROP TABLE "post_registration_form_assignments";

-- DropTable
DROP TABLE "registration_form_assignments";

-- DropTable
DROP TABLE "registration_invitations";

-- DropTable
DROP TABLE "registration_payment_history";

-- DropTable
DROP TABLE "registration_refunds";

-- DropTable
DROP TABLE "registration_responses";

-- DropTable
DROP TABLE "registration_waitlist_entries";

-- DropTable
DROP TABLE "subevents";

-- DropEnum
DROP TYPE "CommitteeRole";

-- DropEnum
DROP TYPE "FormFieldType";

-- DropEnum
DROP TYPE "FormQuestionStatus";

-- DropEnum
DROP TYPE "OrderMemberStatus";

-- DropEnum
DROP TYPE "OrderPaymentStatus";

-- DropEnum
DROP TYPE "PaymentProofStatus";

-- DropEnum
DROP TYPE "PaymentStatus";

-- DropEnum
DROP TYPE "RefundStatus";

-- DropEnum
DROP TYPE "RegistrationApprovalMode";

-- DropEnum
DROP TYPE "RegistrationFormAudience";

-- DropEnum
DROP TYPE "RegistrationFormStage";

-- DropEnum
DROP TYPE "RegistrationInvitationStatus";

-- DropEnum
DROP TYPE "RegistrationMode";

-- DropEnum
DROP TYPE "RegistrationResponseStatus";

-- DropEnum
DROP TYPE "RegistrationStatus";

-- DropEnum
DROP TYPE "SubeventStatus";

-- DropEnum
DROP TYPE "SubeventType";

-- DropEnum
DROP TYPE "SubeventVisibility";

-- DropEnum
DROP TYPE "TicketStatus";

-- DropEnum
DROP TYPE "WaitlistStatus";

-- CreateTable
CREATE TABLE "event_groups" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "publicDescription" TEXT,
    "internalDescription" TEXT,
    "coverImageUrl" TEXT,
    "primaryColor" VARCHAR(20),
    "secondaryColor" VARCHAR(20),
    "status" "EventGroupStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" VARCHAR(100) NOT NULL,
    "updatedAt" TIMESTAMP(3),
    "updatedBy" VARCHAR(100),

    CONSTRAINT "event_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_group_organizers" (
    "eventGroupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "OrganizerRole" NOT NULL DEFAULT 'ORGANIZER',
    "assignedAt" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedBy" TEXT,

    CONSTRAINT "event_group_organizers_pkey" PRIMARY KEY ("eventGroupId","userId")
);

-- CreateTable
CREATE TABLE "event_organizers" (
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "OrganizerRole" NOT NULL DEFAULT 'ORGANIZER',
    "assignedAt" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedBy" TEXT,

    CONSTRAINT "event_organizers_pkey" PRIMARY KEY ("eventId","userId")
);

-- CreateTable
CREATE TABLE "payment_correction_targets" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "orderMemberId" TEXT NOT NULL,
    "requestedByUserId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "requestedAt" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deadlineAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "payment_correction_targets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bundle_membership_audits" (
    "id" TEXT NOT NULL,
    "registrationOrderId" TEXT NOT NULL,
    "orderMemberId" TEXT,
    "subjectUserId" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "action" "BundleMembershipAction" NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bundle_membership_audits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "event_groups_status_createdAt_idx" ON "event_groups"("status", "createdAt");

-- CreateIndex
CREATE INDEX "event_group_organizers_userId_idx" ON "event_group_organizers"("userId");

-- CreateIndex
CREATE INDEX "event_organizers_userId_idx" ON "event_organizers"("userId");

-- CreateIndex
CREATE INDEX "payment_correction_targets_paymentId_orderMemberId_resolved_idx" ON "payment_correction_targets"("paymentId", "orderMemberId", "resolvedAt");

-- CreateIndex
CREATE INDEX "bundle_membership_audits_registrationOrderId_createdAt_idx" ON "bundle_membership_audits"("registrationOrderId", "createdAt");

-- CreateIndex
CREATE INDEX "attendance_check_ins_eventId_checkedInAt_idx" ON "attendance_check_ins"("eventId", "checkedInAt");

-- CreateIndex
CREATE INDEX "events_eventGroupId_status_idx" ON "events"("eventGroupId", "status");

-- CreateIndex
CREATE INDEX "events_status_startsAt_idx" ON "events"("status", "startsAt");

-- CreateIndex
CREATE UNIQUE INDEX "form_question_options_questionId_value_key" ON "form_question_options"("questionId", "value");

-- CreateIndex
CREATE UNIQUE INDEX "form_question_options_questionId_orderIndex_key" ON "form_question_options"("questionId", "orderIndex");

-- CreateIndex
CREATE UNIQUE INDEX "form_questions_sectionId_fieldKey_key" ON "form_questions"("sectionId", "fieldKey");

-- CreateIndex
CREATE UNIQUE INDEX "form_questions_sectionId_orderIndex_key" ON "form_questions"("sectionId", "orderIndex");

-- CreateIndex
CREATE UNIQUE INDEX "registration_capacity_holds_registrationOrderId_key" ON "registration_capacity_holds"("registrationOrderId");

-- CreateIndex
CREATE INDEX "registration_capacity_holds_eventId_status_expiresAt_idx" ON "registration_capacity_holds"("eventId", "status", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "registration_form_submissions_registrationFormId_orderMembe_key" ON "registration_form_submissions"("registrationFormId", "orderMemberId");

-- CreateIndex
CREATE INDEX "registration_forms_eventId_status_idx" ON "registration_forms"("eventId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "registration_forms_eventId_version_key" ON "registration_forms"("eventId", "version");

-- CreateIndex
CREATE INDEX "registration_order_members_eventId_userId_status_idx" ON "registration_order_members"("eventId", "userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "registration_order_members_id_registrationOrderId_key" ON "registration_order_members"("id", "registrationOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "registration_orders_bundleCodeHash_key" ON "registration_orders"("bundleCodeHash");

-- CreateIndex
CREATE INDEX "registration_orders_ticketPackageId_status_idx" ON "registration_orders"("ticketPackageId", "status");

-- CreateIndex
CREATE INDEX "registration_payment_proofs_paymentId_orderMemberId_status_idx" ON "registration_payment_proofs"("paymentId", "orderMemberId", "status");

-- CreateIndex
CREATE INDEX "registration_payments_status_expiresAt_idx" ON "registration_payments"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "registration_tickets_eventId_status_idx" ON "registration_tickets"("eventId", "status");

-- CreateIndex
CREATE INDEX "ticket_packages_eventId_status_salesStartAt_salesEndAt_idx" ON "ticket_packages"("eventId", "status", "salesStartAt", "salesEndAt");

-- CreateIndex
CREATE UNIQUE INDEX "ticket_packages_eventId_code_key" ON "ticket_packages"("eventId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "ticket_packages_id_eventId_key" ON "ticket_packages"("id", "eventId");

-- AddForeignKey
ALTER TABLE "event_groups" ADD CONSTRAINT "event_groups_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_groups" ADD CONSTRAINT "event_groups_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_group_organizers" ADD CONSTRAINT "event_group_organizers_eventGroupId_fkey" FOREIGN KEY ("eventGroupId") REFERENCES "event_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_group_organizers" ADD CONSTRAINT "event_group_organizers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_group_organizers" ADD CONSTRAINT "event_group_organizers_assignedBy_fkey" FOREIGN KEY ("assignedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_eventGroupId_fkey" FOREIGN KEY ("eventGroupId") REFERENCES "event_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_organizers" ADD CONSTRAINT "event_organizers_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_organizers" ADD CONSTRAINT "event_organizers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_organizers" ADD CONSTRAINT "event_organizers_assignedBy_fkey" FOREIGN KEY ("assignedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registration_forms" ADD CONSTRAINT "registration_forms_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_questions" ADD CONSTRAINT "form_questions_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "registration_form_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_question_options" ADD CONSTRAINT "form_question_options_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "form_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registration_orders" ADD CONSTRAINT "registration_orders_ticketPackageId_eventId_fkey" FOREIGN KEY ("ticketPackageId", "eventId") REFERENCES "ticket_packages"("id", "eventId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registration_order_members" ADD CONSTRAINT "registration_order_members_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registration_capacity_holds" ADD CONSTRAINT "registration_capacity_holds_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registration_form_submissions" ADD CONSTRAINT "registration_form_submissions_orderMemberId_registrationOr_fkey" FOREIGN KEY ("orderMemberId", "registrationOrderId") REFERENCES "registration_order_members"("id", "registrationOrderId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registration_payment_proofs" ADD CONSTRAINT "registration_payment_proofs_orderMemberId_fkey" FOREIGN KEY ("orderMemberId") REFERENCES "registration_order_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registration_payment_proofs" ADD CONSTRAINT "registration_payment_proofs_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_correction_targets" ADD CONSTRAINT "payment_correction_targets_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "registration_payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_correction_targets" ADD CONSTRAINT "payment_correction_targets_orderMemberId_fkey" FOREIGN KEY ("orderMemberId") REFERENCES "registration_order_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_correction_targets" ADD CONSTRAINT "payment_correction_targets_requestedByUserId_fkey" FOREIGN KEY ("requestedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registration_tickets" ADD CONSTRAINT "registration_tickets_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_check_ins" ADD CONSTRAINT "attendance_check_ins_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bundle_membership_audits" ADD CONSTRAINT "bundle_membership_audits_registrationOrderId_fkey" FOREIGN KEY ("registrationOrderId") REFERENCES "registration_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bundle_membership_audits" ADD CONSTRAINT "bundle_membership_audits_orderMemberId_fkey" FOREIGN KEY ("orderMemberId") REFERENCES "registration_order_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bundle_membership_audits" ADD CONSTRAINT "bundle_membership_audits_subjectUserId_fkey" FOREIGN KEY ("subjectUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bundle_membership_audits" ADD CONSTRAINT "bundle_membership_audits_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "events" ADD CONSTRAINT "events_schedule_check" CHECK ("endsAt" IS NULL OR "startsAt" IS NULL OR "endsAt" > "startsAt");
ALTER TABLE "events" ADD CONSTRAINT "events_capacity_check" CHECK ("capacity" IS NULL OR "capacity" > 0);
ALTER TABLE "events" ADD CONSTRAINT "events_registration_window_check" CHECK ("registrationClosesAt" IS NULL OR "registrationOpensAt" IS NULL OR "registrationClosesAt" > "registrationOpensAt");
ALTER TABLE "ticket_packages" ADD CONSTRAINT "ticket_packages_seat_count_check" CHECK ("seatCount" > 0);
ALTER TABLE "ticket_packages" ADD CONSTRAINT "ticket_packages_price_check" CHECK ("priceMinor" >= 0);
ALTER TABLE "ticket_packages" ADD CONSTRAINT "ticket_packages_sales_window_check" CHECK ("salesEndAt" IS NULL OR "salesStartAt" IS NULL OR "salesEndAt" > "salesStartAt");
ALTER TABLE "registration_orders" ADD CONSTRAINT "registration_orders_amounts_check" CHECK ("seatCount" > 0 AND "subtotalMinor" >= 0 AND "totalMinor" >= 0);
ALTER TABLE "registration_order_members" ADD CONSTRAINT "registration_order_members_position_check" CHECK ("position" >= 0);
ALTER TABLE "registration_capacity_holds" ADD CONSTRAINT "registration_capacity_holds_quantity_check" CHECK ("quantity" > 0);
ALTER TABLE "registration_payments" ADD CONSTRAINT "registration_payments_amount_check" CHECK ("amountMinor" > 0);

CREATE UNIQUE INDEX "registration_forms_one_published_per_event" ON "registration_forms" ("eventId") WHERE "status" = 'PUBLISHED';
CREATE UNIQUE INDEX "registration_members_one_active_per_event_user" ON "registration_order_members" ("eventId", "userId") WHERE "status" IN ('ACTIVE', 'LOCKED');
CREATE UNIQUE INDEX "registration_payment_proofs_one_current" ON "registration_payment_proofs" ("paymentId", "orderMemberId") WHERE "status" = 'CURRENT';
CREATE UNIQUE INDEX "payment_correction_targets_one_active" ON "payment_correction_targets" ("paymentId", "orderMemberId") WHERE "resolvedAt" IS NULL;
