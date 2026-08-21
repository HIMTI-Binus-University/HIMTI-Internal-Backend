CREATE TYPE "PrivateUploadStatus" AS ENUM ('QUARANTINED', 'AVAILABLE', 'DELETED');
CREATE TYPE "PrivateUploadPurpose" AS ENUM ('PAYMENT_PROOF');

-- Payment review permissions are additive and intentionally granted only to
-- the established Admin role. An existing Admin user supplies required audit
-- ownership, matching the Phase 6 provisioning strategy.
WITH permission_seed(name) AS (
  VALUES ('review_event_payments'), ('view_payment_proofs')
), admin_creator AS (
  SELECT u."id"
  FROM "users" u
  JOIN "user_has_roles" ur ON ur."userId" = u."id"
  JOIN "roles" r ON r."id" = ur."roleId"
  WHERE r."roleName" = 'Admin'
  ORDER BY u."createdAt" ASC
  LIMIT 1
)
INSERT INTO "permissions" ("id", "name", "status", "createdAt", "createdBy")
SELECT 'phase7-' || md5(permission_seed.name), permission_seed.name, 'ACTIVE', CURRENT_TIMESTAMP, admin_creator."id"
FROM permission_seed CROSS JOIN admin_creator
ON CONFLICT ("name") DO NOTHING;

INSERT INTO "role_has_permissions" ("roleId", "permissionId", "assignedAt")
SELECT r."id", p."id", CURRENT_TIMESTAMP
FROM "roles" r
JOIN "permissions" p ON p."name" IN ('review_event_payments', 'view_payment_proofs')
WHERE r."roleName" = 'Admin'
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

ALTER TABLE "subevents"
  ADD COLUMN "paymentCurrency" CHAR(3) NOT NULL DEFAULT 'IDR',
  ADD COLUMN "paymentAmountMinor" BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN "paymentBankName" VARCHAR(100),
  ADD COLUMN "paymentAccountHolder" VARCHAR(150),
  ADD COLUMN "paymentAccountNumberCanonical" VARCHAR(100),
  ADD COLUMN "paymentInstructions" TEXT,
  ADD COLUMN "paymentProofTypes" TEXT[] NOT NULL DEFAULT ARRAY['image/jpeg','image/png','image/webp','application/pdf']::TEXT[],
  ADD COLUMN "paymentProofMaxBytes" INTEGER NOT NULL DEFAULT 10485760;

ALTER TABLE "registration_payments"
  ADD COLUMN "revision" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "reviewedBy" TEXT,
  ADD COLUMN "reviewedAt" TIMESTAMP(3);

CREATE TABLE "private_uploads" (
  "id" TEXT NOT NULL,
  "storageKey" VARCHAR(255) NOT NULL,
  "purpose" "PrivateUploadPurpose" NOT NULL,
  "status" "PrivateUploadStatus" NOT NULL DEFAULT 'QUARANTINED',
  "ownerUserId" TEXT NOT NULL,
  "mediaType" VARCHAR(100) NOT NULL,
  "originalFilename" VARCHAR(255) NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "sha256" CHAR(64) NOT NULL,
  "createdAt" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "availableAt" TIMESTAMP(3),
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "private_uploads_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "registration_payment_proofs" ADD COLUMN "uploadId" TEXT;
CREATE UNIQUE INDEX "private_uploads_storageKey_key" ON "private_uploads"("storageKey");
CREATE INDEX "private_uploads_ownerUserId_purpose_createdAt_idx" ON "private_uploads"("ownerUserId", "purpose", "createdAt");
CREATE INDEX "private_uploads_status_createdAt_idx" ON "private_uploads"("status", "createdAt");
CREATE UNIQUE INDEX "registration_payment_proofs_uploadId_key" ON "registration_payment_proofs"("uploadId");
CREATE UNIQUE INDEX "registration_payment_proofs_one_submitted_idx" ON "registration_payment_proofs"("paymentId") WHERE "status" = 'SUBMITTED';
ALTER TABLE "private_uploads" ADD CONSTRAINT "private_uploads_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "registration_payment_proofs" ADD CONSTRAINT "registration_payment_proofs_uploadId_fkey" FOREIGN KEY ("uploadId") REFERENCES "private_uploads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "registration_payments" ADD CONSTRAINT "registration_payments_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "subevents" ADD CONSTRAINT "subevents_paymentProofMaxBytes_check" CHECK ("paymentProofMaxBytes" > 0 AND "paymentProofMaxBytes" <= 10485760);
ALTER TABLE "subevents" ADD CONSTRAINT "subevents_paymentAmountMinor_check" CHECK ("paymentAmountMinor" >= 0);
ALTER TABLE "subevents" ADD CONSTRAINT "subevents_paymentCurrency_check" CHECK ("paymentCurrency" ~ '^[A-Z]{3}$');
ALTER TABLE "registration_payments" ADD CONSTRAINT "registration_payments_revision_check" CHECK ("revision" > 0);
ALTER TABLE "private_uploads" ADD CONSTRAINT "private_uploads_sizeBytes_check" CHECK ("sizeBytes" > 0 AND "sizeBytes" <= 10485760);
ALTER TABLE "private_uploads" ADD CONSTRAINT "private_uploads_sha256_check" CHECK ("sha256" ~ '^[a-f0-9]{64}$');
