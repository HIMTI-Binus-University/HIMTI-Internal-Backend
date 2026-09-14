ALTER TABLE "subevents"
ADD COLUMN "attendanceCheckoutEnabled" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "registration_tickets"
ADD COLUMN "tokenCiphertext" TEXT,
ADD COLUMN "tokenIv" VARCHAR(64),
ADD COLUMN "tokenAuthTag" VARCHAR(64),
ADD COLUMN "keyVersion" VARCHAR(32);

ALTER TABLE "attendance_check_ins"
DROP CONSTRAINT IF EXISTS "attendance_check_ins_ticketId_key";

ALTER TABLE "attendance_check_ins"
ADD COLUMN "subEventId" TEXT,
ADD COLUMN "checkedOutAt" TIMESTAMP(3),
ADD COLUMN "voidedAt" TIMESTAMP(3),
ADD COLUMN "voidedBy" TEXT,
ADD COLUMN "voidReason" TEXT,
ADD COLUMN "correctionReason" TEXT,
ADD COLUMN "revision" INTEGER NOT NULL DEFAULT 1;

UPDATE "attendance_check_ins" AS check_in
SET "subEventId" = ticket."subEventId"
FROM "registration_tickets" AS ticket
WHERE ticket."id" = check_in."ticketId";

ALTER TABLE "attendance_check_ins"
ALTER COLUMN "subEventId" SET NOT NULL,
ADD CONSTRAINT "attendance_check_ins_subEventId_fkey"
FOREIGN KEY ("subEventId") REFERENCES "subevents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "attendance_check_ins_subEventId_checkedInAt_idx"
ON "attendance_check_ins"("subEventId", "checkedInAt");
CREATE INDEX "attendance_check_ins_ticketId_voidedAt_idx"
ON "attendance_check_ins"("ticketId", "voidedAt");

CREATE TABLE "attendance_audits" (
  "id" TEXT NOT NULL,
  "attendanceCheckInId" TEXT NOT NULL,
  "subEventId" TEXT NOT NULL,
  "actorUserId" TEXT NOT NULL,
  "action" VARCHAR(50) NOT NULL,
  "reason" TEXT,
  "revision" INTEGER NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "attendance_audits_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "attendance_audits_attendanceCheckInId_fkey" FOREIGN KEY ("attendanceCheckInId") REFERENCES "attendance_check_ins"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "attendance_audits_subEventId_fkey" FOREIGN KEY ("subEventId") REFERENCES "subevents"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "attendance_audits_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "attendance_audits_attendanceCheckInId_createdAt_idx"
ON "attendance_audits"("attendanceCheckInId", "createdAt");
CREATE INDEX "attendance_audits_subEventId_createdAt_idx"
ON "attendance_audits"("subEventId", "createdAt");
