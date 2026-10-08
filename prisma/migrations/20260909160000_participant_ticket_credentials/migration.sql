ALTER TABLE "registration_tickets"
ADD COLUMN "credentialEncrypted" TEXT;

CREATE UNIQUE INDEX "registration_order_members_id_eventId_key"
ON "registration_order_members" ("id", "eventId");

CREATE UNIQUE INDEX "registration_tickets_id_eventId_key"
ON "registration_tickets" ("id", "eventId");

ALTER TABLE "registration_tickets"
ADD CONSTRAINT "registration_tickets_member_event_scope_fkey"
FOREIGN KEY ("orderMemberId", "eventId")
REFERENCES "registration_order_members" ("id", "eventId")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "attendance_check_ins"
ADD CONSTRAINT "attendance_check_ins_ticket_event_scope_fkey"
FOREIGN KEY ("ticketId", "eventId")
REFERENCES "registration_tickets" ("id", "eventId")
ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE UNIQUE INDEX "attendance_check_ins_one_active_ticket_key"
ON "attendance_check_ins" ("ticketId") WHERE "voidedAt" IS NULL;

ALTER TABLE "attendance_check_ins"
ADD CONSTRAINT "attendance_check_ins_revision_positive_check" CHECK ("revision" > 0),
ADD CONSTRAINT "attendance_check_ins_checkout_after_checkin_check"
CHECK ("checkedOutAt" IS NULL OR "checkedOutAt" >= "checkedInAt");
