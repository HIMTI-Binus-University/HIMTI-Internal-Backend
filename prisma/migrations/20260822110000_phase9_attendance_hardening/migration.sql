CREATE UNIQUE INDEX "attendance_check_ins_one_active_ticket_key"
ON "attendance_check_ins" ("ticketId") WHERE "voidedAt" IS NULL;

ALTER TABLE "attendance_check_ins"
ADD CONSTRAINT "attendance_check_ins_revision_positive_check" CHECK ("revision" > 0),
ADD CONSTRAINT "attendance_check_ins_checkout_after_checkin_check" CHECK ("checkedOutAt" IS NULL OR "checkedOutAt" >= "checkedInAt"),
ADD CONSTRAINT "attendance_check_ins_void_reason_check" CHECK ("voidedAt" IS NULL OR ("voidedBy" IS NOT NULL AND length(btrim("voidReason")) >= 3));

ALTER TABLE "attendance_audits"
ADD CONSTRAINT "attendance_audits_revision_positive_check" CHECK ("revision" > 0),
ADD CONSTRAINT "attendance_audits_action_check" CHECK ("action" IN ('CHECK_IN', 'CHECK_OUT', 'VOID'));
