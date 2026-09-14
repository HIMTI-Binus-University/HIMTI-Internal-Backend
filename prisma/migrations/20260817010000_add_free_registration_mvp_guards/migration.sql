-- Reconcile indexes dropped by the already-applied 20260816165023 migration.
CREATE INDEX IF NOT EXISTS "registration_forms_logicalKey_version_idx"
ON "registration_forms"("logicalKey", "version");

CREATE INDEX IF NOT EXISTS "registration_form_sections_form_status_order_idx"
ON "registration_form_sections"("registrationFormId", "status", "orderIndex");

ALTER TABLE "registration_orders"
ADD COLUMN IF NOT EXISTS "idempotencyFingerprint" VARCHAR(128);

CREATE INDEX IF NOT EXISTS "registration_orders_buyerUserId_subEventId_status_idx"
ON "registration_orders"("buyerUserId", "subEventId", "status");

CREATE UNIQUE INDEX IF NOT EXISTS "registration_capacity_holds_active_order_idx"
ON "registration_capacity_holds"("registrationOrderId")
WHERE "status" = 'ACTIVE';

-- Deterministic IDs and codes make this safe to rerun and safe alongside the
-- application-level provisioning used when a sub-event switches to INTERNAL.
INSERT INTO "ticket_packages" (
   "id", "eventId", "subEventId", "code", "name", "description", "status",
   "seatCount", "currency", "priceMinor", "createdAt"
)
SELECT
   'free-default-' || s."id", s."eventId", s."id", 'FREE-INDIVIDUAL',
   'Free individual registration', 'Default one-seat free registration package',
   'ACTIVE', 1, 'IDR', 0, CURRENT_TIMESTAMP
FROM "subevents" s
WHERE s."registrationMode" = 'INTERNAL'
  AND NOT EXISTS (
     SELECT 1 FROM "ticket_packages" p WHERE p."subEventId" = s."id"
  )
ON CONFLICT ("subEventId", "code") DO NOTHING;

INSERT INTO "registration_form_assignments" (
   "id", "registrationFormId", "ticketPackageId", "audience", "isRequired",
   "orderIndex", "createdAt"
)
SELECT
   'default-attendee-' || f."id", f."id", NULL, 'EACH_ATTENDEE', true, 0,
   CURRENT_TIMESTAMP
FROM "registration_forms" f
WHERE f."status" = 'PUBLISHED'
  AND f."stage" = 'REGISTRATION'
  AND NOT EXISTS (
     SELECT 1 FROM "registration_form_assignments" a
     WHERE a."registrationFormId" = f."id"
  )
ON CONFLICT DO NOTHING;
