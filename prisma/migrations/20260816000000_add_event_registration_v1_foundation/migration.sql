-- CreateEnum
CREATE TYPE "RegistrationMode" AS ENUM ('INTERNAL', 'EXTERNAL', 'DISABLED');

-- CreateEnum
CREATE TYPE "RegistrationApprovalMode" AS ENUM ('AUTO_APPROVE', 'MANUAL_REVIEW');

-- CreateEnum
CREATE TYPE "TicketPackageStatus" AS ENUM ('DRAFT', 'ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "RegistrationOrderStatus" AS ENUM ('DRAFT', 'AWAITING_MEMBERS', 'HOLDING', 'SUBMITTED', 'PENDING_PAYMENT', 'PAYMENT_REVIEW', 'PENDING_APPROVAL', 'APPROVED', 'NEEDS_CORRECTION', 'WAITLISTED', 'REJECTED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "OrderMemberStatus" AS ENUM ('INVITED', 'ACCEPTED', 'READY', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CapacityHoldStatus" AS ENUM ('ACTIVE', 'CONSUMED', 'RELEASED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "RegistrationFormStage" AS ENUM ('REGISTRATION', 'POST_SUBMISSION', 'POST_APPROVAL');

-- CreateEnum
CREATE TYPE "RegistrationFormAudience" AS ENUM ('BUYER', 'EACH_ATTENDEE', 'ALL_ORDER_MEMBERS');

-- CreateEnum
CREATE TYPE "FormSubmissionStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'LOCKED', 'NEEDS_CORRECTION', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "OrderPaymentStatus" AS ENUM ('UNPAID', 'PROOF_SUBMITTED', 'VERIFIED', 'REJECTED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentProofStatus" AS ENUM ('SUBMITTED', 'ACCEPTED', 'REJECTED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "RefundStatus" AS ENUM ('NOT_REQUIRED', 'REQUIRED', 'PROCESSING', 'COMPLETED', 'DENIED');

-- CreateEnum
CREATE TYPE "RegistrationInvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "WaitlistStatus" AS ENUM ('WAITING', 'OFFERED', 'CONVERTED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('PENDING', 'ACTIVE', 'USED', 'EXPIRED', 'REVOKED');

-- AlterTable
ALTER TABLE "form_question_options" ADD COLUMN     "orderIndex" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "form_questions" ADD COLUMN     "sectionId" TEXT;

-- AlterTable
ALTER TABLE "registration_forms" ADD COLUMN     "description" TEXT,
ADD COLUMN     "logicalKey" VARCHAR(100),
ADD COLUMN     "name" VARCHAR(255) NOT NULL DEFAULT 'Registration',
ADD COLUMN     "publishedAt" TIMESTAMP(3),
ADD COLUMN     "stage" "RegistrationFormStage" NOT NULL DEFAULT 'REGISTRATION',
ADD COLUMN     "supersedesId" TEXT,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "subevents" ADD COLUMN     "approvalMode" "RegistrationApprovalMode" NOT NULL DEFAULT 'MANUAL_REVIEW',
ADD COLUMN     "cancellationClosesAt" TIMESTAMP(3),
ADD COLUMN     "checkoutHoldMinutes" INTEGER NOT NULL DEFAULT 15,
ADD COLUMN     "correctionDeadlineHours" INTEGER NOT NULL DEFAULT 24,
ADD COLUMN     "memberDeadlineHours" INTEGER NOT NULL DEFAULT 24,
ADD COLUMN     "paymentDeadlineHours" INTEGER NOT NULL DEFAULT 24,
ADD COLUMN     "registrationClosesAt" TIMESTAMP(3),
ADD COLUMN     "registrationMode" "RegistrationMode" NOT NULL DEFAULT 'DISABLED',
ADD COLUMN     "registrationOpensAt" TIMESTAMP(3),
ADD COLUMN     "waitlistOfferHours" INTEGER NOT NULL DEFAULT 24;

-- Preserve existing external-link behavior and draft native forms.
UPDATE "subevents"
SET "registrationMode" = 'EXTERNAL'
WHERE NULLIF(BTRIM("destinationUrl"), '') IS NOT NULL;

UPDATE "subevents" AS s
SET "registrationMode" = 'INTERNAL'
WHERE s."registrationMode" = 'DISABLED'
  AND EXISTS (
      SELECT 1
      FROM "registration_forms" AS rf
      WHERE rf."subEventId" = s."id"
  );

UPDATE "subevents"
SET "approvalMode" = 'AUTO_APPROVE'
WHERE "autoAcceptRegistration" = true;

-- CreateTable
CREATE TABLE "ticket_packages" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "subEventId" TEXT NOT NULL,
    "code" VARCHAR(100) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "status" "TicketPackageStatus" NOT NULL DEFAULT 'DRAFT',
    "seatCount" INTEGER NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'IDR',
    "priceMinor" BIGINT NOT NULL,
    "salesStartAt" TIMESTAMP(3),
    "salesEndAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "ticket_packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registration_orders" (
    "id" TEXT NOT NULL,
    "orderNumber" VARCHAR(50) NOT NULL,
    "eventId" TEXT NOT NULL,
    "subEventId" TEXT NOT NULL,
    "ticketPackageId" TEXT NOT NULL,
    "buyerUserId" TEXT NOT NULL,
    "status" "RegistrationOrderStatus" NOT NULL DEFAULT 'DRAFT',
    "seatCount" INTEGER NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'IDR',
    "subtotalMinor" BIGINT NOT NULL,
    "totalMinor" BIGINT NOT NULL,
    "idempotencyKey" VARCHAR(255),
    "memberDeadlineAt" TIMESTAMP(3),
    "paymentDeadlineAt" TIMESTAMP(3),
    "correctionDeadlineAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancellationReason" TEXT,
    "createdAt" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "registration_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registration_order_members" (
    "id" TEXT NOT NULL,
    "registrationOrderId" TEXT NOT NULL,
    "subEventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "OrderMemberStatus" NOT NULL DEFAULT 'INVITED',
    "isBuyer" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL,
    "invitedAt" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),
    "readyAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "registration_order_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registration_capacity_holds" (
    "id" TEXT NOT NULL,
    "registrationOrderId" TEXT NOT NULL,
    "subEventId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "status" "CapacityHoldStatus" NOT NULL DEFAULT 'ACTIVE',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "releasedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "registration_capacity_holds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registration_form_sections" (
    "id" TEXT NOT NULL,
    "registrationFormId" TEXT NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "orderIndex" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "registration_form_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registration_form_assignments" (
    "id" TEXT NOT NULL,
    "registrationFormId" TEXT NOT NULL,
    "ticketPackageId" TEXT,
    "audience" "RegistrationFormAudience" NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "opensAt" TIMESTAMP(3),
    "closesAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "registration_form_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registration_form_submissions" (
    "id" TEXT NOT NULL,
    "registrationFormId" TEXT NOT NULL,
    "registrationOrderId" TEXT NOT NULL,
    "orderMemberId" TEXT,
    "status" "FormSubmissionStatus" NOT NULL DEFAULT 'DRAFT',
    "revision" INTEGER NOT NULL DEFAULT 1,
    "submittedAt" TIMESTAMP(3),
    "lockedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "registration_form_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registration_form_submission_answers" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "formQuestionId" TEXT NOT NULL,
    "textValue" TEXT,
    "numberValue" DECIMAL(30,10),
    "dateValue" TIMESTAMP(3),
    "fileUrl" TEXT,
    "createdAt" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "registration_form_submission_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registration_form_selected_options" (
    "answerId" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,

    CONSTRAINT "registration_form_selected_options_pkey" PRIMARY KEY ("answerId","optionId")
);

-- CreateTable
CREATE TABLE "registration_payments" (
    "id" TEXT NOT NULL,
    "registrationOrderId" TEXT NOT NULL,
    "status" "OrderPaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "currency" CHAR(3) NOT NULL DEFAULT 'IDR',
    "amountMinor" BIGINT NOT NULL,
    "bankSnapshot" JSONB,
    "submittedAt" TIMESTAMP(3),
    "verifiedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "registration_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registration_payment_proofs" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "fileKey" TEXT NOT NULL,
    "status" "PaymentProofStatus" NOT NULL DEFAULT 'SUBMITTED',
    "reviewedBy" TEXT,
    "reviewReason" TEXT,
    "submittedAt" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "registration_payment_proofs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registration_payment_history" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "fromStatus" "OrderPaymentStatus",
    "toStatus" "OrderPaymentStatus" NOT NULL,
    "actorUserId" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "registration_payment_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registration_refunds" (
    "id" TEXT NOT NULL,
    "registrationOrderId" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "status" "RefundStatus" NOT NULL DEFAULT 'NOT_REQUIRED',
    "amountMinor" BIGINT NOT NULL,
    "reason" TEXT,
    "processedBy" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "registration_refunds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registration_invitations" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "subEventId" TEXT NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "tokenHash" VARCHAR(128) NOT NULL,
    "status" "RegistrationInvitationStatus" NOT NULL DEFAULT 'PENDING',
    "sentBy" TEXT NOT NULL,
    "claimedBy" TEXT,
    "orderMemberId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "registration_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registration_waitlist_entries" (
    "id" TEXT NOT NULL,
    "registrationOrderId" TEXT NOT NULL,
    "subEventId" TEXT NOT NULL,
    "ticketPackageId" TEXT NOT NULL,
    "status" "WaitlistStatus" NOT NULL DEFAULT 'WAITING',
    "position" INTEGER NOT NULL,
    "offeredAt" TIMESTAMP(3),
    "offerExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "registration_waitlist_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registration_tickets" (
    "id" TEXT NOT NULL,
    "orderMemberId" TEXT NOT NULL,
    "subEventId" TEXT NOT NULL,
    "tokenHash" VARCHAR(128) NOT NULL,
    "status" "TicketStatus" NOT NULL DEFAULT 'PENDING',
    "issuedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "registration_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_check_ins" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "operatorUserId" TEXT NOT NULL,
    "checkedInAt" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" VARCHAR(100),

    CONSTRAINT "attendance_check_ins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registration_status_history" (
    "id" TEXT NOT NULL,
    "registrationOrderId" TEXT NOT NULL,
    "entityType" VARCHAR(100) NOT NULL,
    "entityId" TEXT NOT NULL,
    "fromStatus" VARCHAR(100),
    "toStatus" VARCHAR(100) NOT NULL,
    "actorUserId" TEXT,
    "reason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "registration_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ticket_packages_eventId_status_idx" ON "ticket_packages"("eventId", "status");

-- CreateIndex
CREATE INDEX "ticket_packages_subEventId_status_salesStartAt_salesEndAt_idx" ON "ticket_packages"("subEventId", "status", "salesStartAt", "salesEndAt");

-- CreateIndex
CREATE UNIQUE INDEX "ticket_packages_subEventId_code_key" ON "ticket_packages"("subEventId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "registration_orders_orderNumber_key" ON "registration_orders"("orderNumber");

-- CreateIndex
CREATE UNIQUE INDEX "registration_orders_idempotencyKey_key" ON "registration_orders"("idempotencyKey");

-- CreateIndex
CREATE INDEX "registration_orders_eventId_status_createdAt_idx" ON "registration_orders"("eventId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "registration_orders_subEventId_status_createdAt_idx" ON "registration_orders"("subEventId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "registration_orders_buyerUserId_createdAt_idx" ON "registration_orders"("buyerUserId", "createdAt");

-- CreateIndex
CREATE INDEX "registration_orders_paymentDeadlineAt_status_idx" ON "registration_orders"("paymentDeadlineAt", "status");

-- CreateIndex
CREATE INDEX "registration_order_members_userId_status_idx" ON "registration_order_members"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "registration_order_members_registrationOrderId_userId_key" ON "registration_order_members"("registrationOrderId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "registration_order_members_registrationOrderId_position_key" ON "registration_order_members"("registrationOrderId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "registration_order_members_active_user_idx"
ON "registration_order_members"("subEventId", "userId")
WHERE "status" <> 'CANCELLED';

-- CreateIndex
CREATE INDEX "registration_capacity_holds_subEventId_status_expiresAt_idx" ON "registration_capacity_holds"("subEventId", "status", "expiresAt");

-- CreateIndex
CREATE INDEX "registration_capacity_holds_registrationOrderId_status_idx" ON "registration_capacity_holds"("registrationOrderId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "registration_form_sections_registrationFormId_orderIndex_key" ON "registration_form_sections"("registrationFormId", "orderIndex");

-- CreateIndex
CREATE INDEX "registration_form_assignments_ticketPackageId_audience_orde_idx" ON "registration_form_assignments"("ticketPackageId", "audience", "orderIndex");

-- CreateIndex
CREATE UNIQUE INDEX "registration_form_assignments_package_idx"
ON "registration_form_assignments"("registrationFormId", "ticketPackageId", "audience")
WHERE "ticketPackageId" IS NOT NULL;

CREATE UNIQUE INDEX "registration_form_assignments_default_idx"
ON "registration_form_assignments"("registrationFormId", "audience")
WHERE "ticketPackageId" IS NULL;

-- CreateIndex
CREATE INDEX "registration_form_submissions_registrationOrderId_status_idx" ON "registration_form_submissions"("registrationOrderId", "status");

-- CreateIndex
CREATE INDEX "registration_form_submissions_orderMemberId_status_idx" ON "registration_form_submissions"("orderMemberId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "registration_form_submissions_member_revision_idx"
ON "registration_form_submissions"("registrationFormId", "registrationOrderId", "orderMemberId", "revision")
WHERE "orderMemberId" IS NOT NULL;

CREATE UNIQUE INDEX "registration_form_submissions_buyer_revision_idx"
ON "registration_form_submissions"("registrationFormId", "registrationOrderId", "revision")
WHERE "orderMemberId" IS NULL;

-- CreateIndex
CREATE INDEX "registration_form_submission_answers_formQuestionId_idx" ON "registration_form_submission_answers"("formQuestionId");

-- CreateIndex
CREATE UNIQUE INDEX "registration_form_submission_answers_submissionId_formQuest_key" ON "registration_form_submission_answers"("submissionId", "formQuestionId");

-- CreateIndex
CREATE INDEX "registration_form_selected_options_optionId_idx" ON "registration_form_selected_options"("optionId");

-- CreateIndex
CREATE UNIQUE INDEX "registration_payments_registrationOrderId_key" ON "registration_payments"("registrationOrderId");

-- CreateIndex
CREATE INDEX "registration_payments_status_createdAt_idx" ON "registration_payments"("status", "createdAt");

-- CreateIndex
CREATE INDEX "registration_payments_expiresAt_status_idx" ON "registration_payments"("expiresAt", "status");

-- CreateIndex
CREATE INDEX "registration_payment_proofs_paymentId_status_submittedAt_idx" ON "registration_payment_proofs"("paymentId", "status", "submittedAt");

-- CreateIndex
CREATE INDEX "registration_payment_proofs_status_submittedAt_idx" ON "registration_payment_proofs"("status", "submittedAt");

-- CreateIndex
CREATE INDEX "registration_payment_history_paymentId_createdAt_idx" ON "registration_payment_history"("paymentId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "registration_refunds_registrationOrderId_key" ON "registration_refunds"("registrationOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "registration_refunds_paymentId_key" ON "registration_refunds"("paymentId");

-- CreateIndex
CREATE INDEX "registration_refunds_status_createdAt_idx" ON "registration_refunds"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "registration_invitations_tokenHash_key" ON "registration_invitations"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "registration_invitations_orderMemberId_key" ON "registration_invitations"("orderMemberId");

-- CreateIndex
CREATE INDEX "registration_invitations_eventId_email_status_idx" ON "registration_invitations"("eventId", "email", "status");

-- CreateIndex
CREATE INDEX "registration_invitations_subEventId_status_expiresAt_idx" ON "registration_invitations"("subEventId", "status", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "registration_waitlist_entries_registrationOrderId_key" ON "registration_waitlist_entries"("registrationOrderId");

-- CreateIndex
CREATE INDEX "registration_waitlist_entries_subEventId_status_createdAt_idx" ON "registration_waitlist_entries"("subEventId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "registration_waitlist_entries_status_offerExpiresAt_idx" ON "registration_waitlist_entries"("status", "offerExpiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "registration_waitlist_entries_subEventId_position_key" ON "registration_waitlist_entries"("subEventId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "registration_tickets_orderMemberId_key" ON "registration_tickets"("orderMemberId");

-- CreateIndex
CREATE UNIQUE INDEX "registration_tickets_tokenHash_key" ON "registration_tickets"("tokenHash");

-- CreateIndex
CREATE INDEX "registration_tickets_subEventId_status_idx" ON "registration_tickets"("subEventId", "status");

-- CreateIndex
CREATE INDEX "registration_tickets_expiresAt_status_idx" ON "registration_tickets"("expiresAt", "status");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_check_ins_ticketId_key" ON "attendance_check_ins"("ticketId");

-- CreateIndex
CREATE INDEX "attendance_check_ins_operatorUserId_checkedInAt_idx" ON "attendance_check_ins"("operatorUserId", "checkedInAt");

-- CreateIndex
CREATE INDEX "registration_status_history_registrationOrderId_createdAt_idx" ON "registration_status_history"("registrationOrderId", "createdAt");

-- CreateIndex
CREATE INDEX "registration_status_history_entityType_entityId_createdAt_idx" ON "registration_status_history"("entityType", "entityId", "createdAt");

-- Enforce positive quantities, non-negative monetary values, and valid windows.
ALTER TABLE "subevents"
ADD CONSTRAINT "subevents_registration_deadlines_check" CHECK (
    "checkoutHoldMinutes" > 0
    AND "memberDeadlineHours" > 0
    AND "paymentDeadlineHours" > 0
    AND "correctionDeadlineHours" > 0
    AND "waitlistOfferHours" > 0
),
ADD CONSTRAINT "subevents_registration_window_check" CHECK (
    "registrationOpensAt" IS NULL
    OR "registrationClosesAt" IS NULL
    OR "registrationOpensAt" < "registrationClosesAt"
);

ALTER TABLE "ticket_packages"
ADD CONSTRAINT "ticket_packages_values_check" CHECK (
    "seatCount" > 0 AND "priceMinor" >= 0
),
ADD CONSTRAINT "ticket_packages_sales_window_check" CHECK (
    "salesStartAt" IS NULL
    OR "salesEndAt" IS NULL
    OR "salesStartAt" < "salesEndAt"
);

ALTER TABLE "registration_orders"
ADD CONSTRAINT "registration_orders_values_check" CHECK (
    "seatCount" > 0
    AND "subtotalMinor" >= 0
    AND "totalMinor" >= 0
);

ALTER TABLE "registration_order_members"
ADD CONSTRAINT "registration_order_members_position_check" CHECK ("position" >= 0);

ALTER TABLE "registration_capacity_holds"
ADD CONSTRAINT "registration_capacity_holds_quantity_check" CHECK ("quantity" > 0);

ALTER TABLE "registration_form_sections"
ADD CONSTRAINT "registration_form_sections_order_check" CHECK ("orderIndex" >= 0);

ALTER TABLE "registration_form_assignments"
ADD CONSTRAINT "registration_form_assignments_order_check" CHECK ("orderIndex" >= 0),
ADD CONSTRAINT "registration_form_assignments_window_check" CHECK (
    "opensAt" IS NULL OR "closesAt" IS NULL OR "opensAt" < "closesAt"
);

ALTER TABLE "registration_form_submissions"
ADD CONSTRAINT "registration_form_submissions_revision_check" CHECK ("revision" > 0);

ALTER TABLE "registration_payments"
ADD CONSTRAINT "registration_payments_amount_check" CHECK ("amountMinor" >= 0);

ALTER TABLE "registration_refunds"
ADD CONSTRAINT "registration_refunds_amount_check" CHECK ("amountMinor" >= 0);

ALTER TABLE "registration_waitlist_entries"
ADD CONSTRAINT "registration_waitlist_entries_position_check" CHECK ("position" > 0);

-- Composite keys ensure every denormalized event and sub-event reference agrees.
CREATE UNIQUE INDEX "subevents_id_eventId_key" ON "subevents"("id", "eventId");
CREATE UNIQUE INDEX "ticket_packages_id_eventId_subEventId_key"
ON "ticket_packages"("id", "eventId", "subEventId");
CREATE UNIQUE INDEX "registration_orders_id_eventId_subEventId_key"
ON "registration_orders"("id", "eventId", "subEventId");
CREATE UNIQUE INDEX "registration_orders_id_subEventId_key"
ON "registration_orders"("id", "subEventId");
CREATE UNIQUE INDEX "registration_order_members_id_subEventId_key"
ON "registration_order_members"("id", "subEventId");

ALTER TABLE "ticket_packages"
ADD CONSTRAINT "ticket_packages_subevent_event_fkey"
FOREIGN KEY ("subEventId", "eventId") REFERENCES "subevents"("id", "eventId")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "registration_orders"
ADD CONSTRAINT "registration_orders_package_scope_fkey"
FOREIGN KEY ("ticketPackageId", "eventId", "subEventId")
REFERENCES "ticket_packages"("id", "eventId", "subEventId")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "registration_order_members"
ADD CONSTRAINT "registration_order_members_order_scope_fkey"
FOREIGN KEY ("registrationOrderId", "subEventId")
REFERENCES "registration_orders"("id", "subEventId")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "registration_capacity_holds"
ADD CONSTRAINT "registration_capacity_holds_order_scope_fkey"
FOREIGN KEY ("registrationOrderId", "subEventId")
REFERENCES "registration_orders"("id", "subEventId")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "registration_tickets"
ADD CONSTRAINT "registration_tickets_member_scope_fkey"
FOREIGN KEY ("orderMemberId", "subEventId")
REFERENCES "registration_order_members"("id", "subEventId")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "form_question_options_formQuestionId_orderIndex_idx" ON "form_question_options"("formQuestionId", "orderIndex");

-- CreateIndex
CREATE UNIQUE INDEX "form_question_options_active_value_idx"
ON "form_question_options"("formQuestionId", "value")
WHERE "isActive" = true;

-- CreateIndex
CREATE INDEX "form_questions_registrationFormId_sectionId_orderIndex_idx" ON "form_questions"("registrationFormId", "sectionId", "orderIndex");

-- CreateIndex
CREATE INDEX "registration_forms_subEventId_stage_status_idx" ON "registration_forms"("subEventId", "stage", "status");

-- CreateIndex
CREATE UNIQUE INDEX "registration_forms_subEventId_logicalKey_version_key" ON "registration_forms"("subEventId", "logicalKey", "version");

-- AddForeignKey
ALTER TABLE "registration_forms" ADD CONSTRAINT "registration_forms_supersedesId_fkey" FOREIGN KEY ("supersedesId") REFERENCES "registration_forms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_questions" ADD CONSTRAINT "form_questions_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "registration_form_sections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_packages" ADD CONSTRAINT "ticket_packages_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_packages" ADD CONSTRAINT "ticket_packages_subEventId_fkey" FOREIGN KEY ("subEventId") REFERENCES "subevents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registration_orders" ADD CONSTRAINT "registration_orders_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registration_orders" ADD CONSTRAINT "registration_orders_subEventId_fkey" FOREIGN KEY ("subEventId") REFERENCES "subevents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registration_orders" ADD CONSTRAINT "registration_orders_ticketPackageId_fkey" FOREIGN KEY ("ticketPackageId") REFERENCES "ticket_packages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registration_orders" ADD CONSTRAINT "registration_orders_buyerUserId_fkey" FOREIGN KEY ("buyerUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registration_order_members" ADD CONSTRAINT "registration_order_members_registrationOrderId_fkey" FOREIGN KEY ("registrationOrderId") REFERENCES "registration_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registration_order_members" ADD CONSTRAINT "registration_order_members_subEventId_fkey" FOREIGN KEY ("subEventId") REFERENCES "subevents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registration_order_members" ADD CONSTRAINT "registration_order_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registration_capacity_holds" ADD CONSTRAINT "registration_capacity_holds_registrationOrderId_fkey" FOREIGN KEY ("registrationOrderId") REFERENCES "registration_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registration_capacity_holds" ADD CONSTRAINT "registration_capacity_holds_subEventId_fkey" FOREIGN KEY ("subEventId") REFERENCES "subevents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registration_form_sections" ADD CONSTRAINT "registration_form_sections_registrationFormId_fkey" FOREIGN KEY ("registrationFormId") REFERENCES "registration_forms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registration_form_assignments" ADD CONSTRAINT "registration_form_assignments_registrationFormId_fkey" FOREIGN KEY ("registrationFormId") REFERENCES "registration_forms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registration_form_assignments" ADD CONSTRAINT "registration_form_assignments_ticketPackageId_fkey" FOREIGN KEY ("ticketPackageId") REFERENCES "ticket_packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registration_form_submissions" ADD CONSTRAINT "registration_form_submissions_registrationFormId_fkey" FOREIGN KEY ("registrationFormId") REFERENCES "registration_forms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registration_form_submissions" ADD CONSTRAINT "registration_form_submissions_registrationOrderId_fkey" FOREIGN KEY ("registrationOrderId") REFERENCES "registration_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registration_form_submissions" ADD CONSTRAINT "registration_form_submissions_orderMemberId_fkey" FOREIGN KEY ("orderMemberId") REFERENCES "registration_order_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registration_form_submission_answers" ADD CONSTRAINT "registration_form_submission_answers_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "registration_form_submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registration_form_submission_answers" ADD CONSTRAINT "registration_form_submission_answers_formQuestionId_fkey" FOREIGN KEY ("formQuestionId") REFERENCES "form_questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registration_form_selected_options" ADD CONSTRAINT "registration_form_selected_options_answerId_fkey" FOREIGN KEY ("answerId") REFERENCES "registration_form_submission_answers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registration_form_selected_options" ADD CONSTRAINT "registration_form_selected_options_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "form_question_options"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registration_payments" ADD CONSTRAINT "registration_payments_registrationOrderId_fkey" FOREIGN KEY ("registrationOrderId") REFERENCES "registration_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registration_payment_proofs" ADD CONSTRAINT "registration_payment_proofs_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "registration_payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registration_payment_proofs" ADD CONSTRAINT "registration_payment_proofs_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registration_payment_history" ADD CONSTRAINT "registration_payment_history_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "registration_payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registration_payment_history" ADD CONSTRAINT "registration_payment_history_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registration_refunds" ADD CONSTRAINT "registration_refunds_registrationOrderId_fkey" FOREIGN KEY ("registrationOrderId") REFERENCES "registration_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registration_refunds" ADD CONSTRAINT "registration_refunds_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "registration_payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registration_refunds" ADD CONSTRAINT "registration_refunds_processedBy_fkey" FOREIGN KEY ("processedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registration_invitations" ADD CONSTRAINT "registration_invitations_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registration_invitations" ADD CONSTRAINT "registration_invitations_subEventId_fkey" FOREIGN KEY ("subEventId") REFERENCES "subevents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registration_invitations" ADD CONSTRAINT "registration_invitations_sentBy_fkey" FOREIGN KEY ("sentBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registration_invitations" ADD CONSTRAINT "registration_invitations_claimedBy_fkey" FOREIGN KEY ("claimedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registration_invitations" ADD CONSTRAINT "registration_invitations_orderMemberId_fkey" FOREIGN KEY ("orderMemberId") REFERENCES "registration_order_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registration_waitlist_entries" ADD CONSTRAINT "registration_waitlist_entries_registrationOrderId_fkey" FOREIGN KEY ("registrationOrderId") REFERENCES "registration_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registration_waitlist_entries" ADD CONSTRAINT "registration_waitlist_entries_subEventId_fkey" FOREIGN KEY ("subEventId") REFERENCES "subevents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registration_waitlist_entries" ADD CONSTRAINT "registration_waitlist_entries_ticketPackageId_fkey" FOREIGN KEY ("ticketPackageId") REFERENCES "ticket_packages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registration_tickets" ADD CONSTRAINT "registration_tickets_orderMemberId_fkey" FOREIGN KEY ("orderMemberId") REFERENCES "registration_order_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registration_tickets" ADD CONSTRAINT "registration_tickets_subEventId_fkey" FOREIGN KEY ("subEventId") REFERENCES "subevents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_check_ins" ADD CONSTRAINT "attendance_check_ins_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "registration_tickets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_check_ins" ADD CONSTRAINT "attendance_check_ins_operatorUserId_fkey" FOREIGN KEY ("operatorUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registration_status_history" ADD CONSTRAINT "registration_status_history_registrationOrderId_fkey" FOREIGN KEY ("registrationOrderId") REFERENCES "registration_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registration_status_history" ADD CONSTRAINT "registration_status_history_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
