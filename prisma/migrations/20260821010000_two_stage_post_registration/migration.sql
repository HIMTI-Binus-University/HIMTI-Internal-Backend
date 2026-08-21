UPDATE "registration_forms"
SET "stage" = 'POST_REGISTRATION'::"RegistrationFormStage"
WHERE "stage" IN ('POST_SUBMISSION', 'POST_APPROVAL');

ALTER TABLE "registration_form_assignments"
ADD COLUMN "blocksCheckIn" BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE "registration_form_submissions"
ADD COLUMN "correctionReason" TEXT,
ADD COLUMN "correctionDeadlineAt" TIMESTAMP(3),
ADD COLUMN "responseIdempotencyKey" VARCHAR(255),
ADD COLUMN "responseIdempotencyFingerprint" VARCHAR(128);

CREATE TABLE "post_registration_form_assignments" (
  "id" TEXT NOT NULL,
  "registrationOrderId" TEXT NOT NULL,
  "registrationFormId" TEXT NOT NULL,
  "logicalFormKey" VARCHAR(100) NOT NULL,
  "orderMemberId" TEXT,
  "audience" "RegistrationFormAudience" NOT NULL,
  "isRequired" BOOLEAN NOT NULL DEFAULT TRUE,
  "blocksCheckIn" BOOLEAN NOT NULL DEFAULT FALSE,
  "orderIndex" INTEGER NOT NULL DEFAULT 0,
  "opensAt" TIMESTAMP(3),
  "closesAt" TIMESTAMP(3),
  "assignedAt" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "responseId" TEXT,
  "reopenReason" TEXT,
  "reopenDeadlineAt" TIMESTAMP(3),
  "reopenedAt" TIMESTAMP(3),
  "reopenedBy" TEXT,
  CONSTRAINT "post_registration_form_assignments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "post_registration_form_assignments_window_check" CHECK ("opensAt" IS NULL OR "closesAt" IS NULL OR "opensAt" < "closesAt"),
  CONSTRAINT "post_registration_form_assignments_order_check" CHECK ("orderIndex" >= 0),
  CONSTRAINT "post_registration_form_assignments_target_check" CHECK (("audience" = 'BUYER' AND "orderMemberId" IS NULL) OR ("audience" <> 'BUYER' AND "orderMemberId" IS NOT NULL)),
  CONSTRAINT "post_registration_form_assignments_reopen_check" CHECK (("reopenDeadlineAt" IS NULL AND "reopenReason" IS NULL AND "reopenedAt" IS NULL) OR ("reopenDeadlineAt" IS NOT NULL AND "reopenReason" IS NOT NULL AND "reopenedAt" IS NOT NULL))
);

CREATE UNIQUE INDEX "post_registration_assignments_buyer_family_key"
ON "post_registration_form_assignments"("registrationOrderId", "logicalFormKey")
WHERE "orderMemberId" IS NULL;
CREATE UNIQUE INDEX "post_registration_assignments_member_family_key"
ON "post_registration_form_assignments"("registrationOrderId", "logicalFormKey", "orderMemberId")
WHERE "orderMemberId" IS NOT NULL;
CREATE UNIQUE INDEX "post_registration_form_assignments_responseId_key" ON "post_registration_form_assignments"("responseId");
CREATE INDEX "post_registration_form_assignments_order_orderIndex_idx" ON "post_registration_form_assignments"("registrationOrderId", "orderIndex");
CREATE INDEX "post_registration_form_assignments_member_blocks_idx" ON "post_registration_form_assignments"("orderMemberId", "blocksCheckIn");
CREATE INDEX "post_registration_form_assignments_form_idx" ON "post_registration_form_assignments"("registrationFormId");
CREATE UNIQUE INDEX "registration_form_submissions_response_idempotency_key"
ON "registration_form_submissions"("responseIdempotencyKey") WHERE "responseIdempotencyKey" IS NOT NULL;

ALTER TABLE "post_registration_form_assignments" ADD CONSTRAINT "post_registration_form_assignments_order_fkey" FOREIGN KEY ("registrationOrderId") REFERENCES "registration_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "post_registration_form_assignments" ADD CONSTRAINT "post_registration_form_assignments_form_fkey" FOREIGN KEY ("registrationFormId") REFERENCES "registration_forms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "post_registration_form_assignments" ADD CONSTRAINT "post_registration_form_assignments_member_fkey" FOREIGN KEY ("orderMemberId") REFERENCES "registration_order_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "post_registration_form_assignments" ADD CONSTRAINT "post_registration_form_assignments_response_fkey" FOREIGN KEY ("responseId") REFERENCES "registration_form_submissions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "post_registration_form_assignments" ADD CONSTRAINT "post_registration_form_assignments_reopener_fkey" FOREIGN KEY ("reopenedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Preserve every pre-existing post-stage response before filling approved orders.
INSERT INTO "post_registration_form_assignments" (
  "id", "registrationOrderId", "registrationFormId", "logicalFormKey", "orderMemberId", "audience",
  "isRequired", "blocksCheckIn", "orderIndex", "opensAt", "closesAt", "assignedAt", "responseId"
)
SELECT
  'post-existing-' || md5(s."id"), s."registrationOrderId", s."registrationFormId",
  COALESCE(f."logicalKey", 'legacy-' || f."id"), s."orderMemberId", s."assignmentAudience",
  s."assignmentRequired", COALESCE(a."blocksCheckIn", FALSE), s."assignmentOrderIndex",
  a."opensAt", a."closesAt", s."createdAt", s."id"
FROM "registration_form_submissions" s
JOIN "registration_forms" f ON f."id" = s."registrationFormId" AND f."stage" = 'POST_REGISTRATION'
LEFT JOIN LATERAL (
  SELECT candidate.* FROM "registration_form_assignments" candidate
  JOIN "registration_orders" o ON o."id" = s."registrationOrderId"
  WHERE candidate."registrationFormId" = s."registrationFormId"
    AND candidate."audience" = s."assignmentAudience"
    AND (candidate."ticketPackageId" = o."ticketPackageId" OR candidate."ticketPackageId" IS NULL)
  ORDER BY (candidate."ticketPackageId" IS NOT NULL) DESC, candidate."orderIndex", candidate."id" LIMIT 1
) a ON TRUE
ON CONFLICT DO NOTHING;

-- Snapshot all published post-registration routes for every currently approved order.
WITH applicable AS (
  SELECT DISTINCT ON (o."id", f."logicalKey", target."memberId")
    o."id" AS "orderId", f."id" AS "formId", f."logicalKey", target."memberId", a."audience",
    a."isRequired", a."blocksCheckIn", a."orderIndex", a."opensAt", a."closesAt", a."id" AS "routeId"
  FROM "registration_orders" o
  JOIN "registration_forms" f ON f."subEventId" = o."subEventId" AND f."status" = 'PUBLISHED' AND f."stage" = 'POST_REGISTRATION' AND f."logicalKey" IS NOT NULL
  JOIN "registration_form_assignments" a ON a."registrationFormId" = f."id"
    AND (a."ticketPackageId" = o."ticketPackageId" OR (a."ticketPackageId" IS NULL AND NOT EXISTS (
      SELECT 1 FROM "registration_form_assignments" override
      WHERE override."registrationFormId" = f."id" AND override."ticketPackageId" = o."ticketPackageId"
    )))
  JOIN LATERAL (
    SELECT NULL::TEXT AS "memberId" WHERE a."audience" = 'BUYER'
    UNION ALL
    SELECT m."id" FROM "registration_order_members" m
    WHERE m."registrationOrderId" = o."id" AND m."status" <> 'CANCELLED' AND a."audience" <> 'BUYER'
  ) target ON TRUE
  WHERE o."status" = 'APPROVED'
  ORDER BY o."id", f."logicalKey", target."memberId", (a."ticketPackageId" IS NOT NULL) DESC, a."orderIndex", a."id"
)
INSERT INTO "post_registration_form_assignments" (
  "id", "registrationOrderId", "registrationFormId", "logicalFormKey", "orderMemberId", "audience",
  "isRequired", "blocksCheckIn", "orderIndex", "opensAt", "closesAt", "assignedAt"
)
SELECT 'post-assignment-' || md5("orderId" || ':' || "logicalKey" || ':' || COALESCE("memberId", 'buyer')),
  "orderId", "formId", "logicalKey", "memberId", "audience", "isRequired", "blocksCheckIn", "orderIndex", "opensAt", "closesAt", CURRENT_TIMESTAMP(0)
FROM applicable ON CONFLICT DO NOTHING;

INSERT INTO "registration_form_submissions" (
  "id", "registrationFormId", "registrationOrderId", "orderMemberId", "assignmentAudience",
  "assignmentRequired", "assignmentOrderIndex", "status", "revision", "createdAt"
)
SELECT 'post-response-' || md5(a."id"), a."registrationFormId", a."registrationOrderId", a."orderMemberId",
  a."audience", a."isRequired", a."orderIndex", 'DRAFT', 1, a."assignedAt"
FROM "post_registration_form_assignments" a WHERE a."responseId" IS NULL
ON CONFLICT DO NOTHING;

UPDATE "post_registration_form_assignments" a
SET "responseId" = 'post-response-' || md5(a."id")
WHERE a."responseId" IS NULL
  AND EXISTS (SELECT 1 FROM "registration_form_submissions" s WHERE s."id" = 'post-response-' || md5(a."id"));

CREATE OR REPLACE FUNCTION enforce_post_registration_assignment_scope() RETURNS trigger AS $$
DECLARE form_scope RECORD; order_scope RECORD; member_scope RECORD;
BEGIN
  SELECT "subEventId", "logicalKey", "stage" INTO form_scope FROM "registration_forms" WHERE "id" = NEW."registrationFormId";
  SELECT "subEventId" INTO order_scope FROM "registration_orders" WHERE "id" = NEW."registrationOrderId";
  IF form_scope."stage" <> 'POST_REGISTRATION' OR form_scope."logicalKey" IS NULL OR form_scope."logicalKey" <> NEW."logicalFormKey" OR form_scope."subEventId" <> order_scope."subEventId" THEN
    RAISE EXCEPTION 'invalid post-registration form/order scope';
  END IF;
  IF NEW."orderMemberId" IS NOT NULL THEN
    SELECT "registrationOrderId", "status" INTO member_scope FROM "registration_order_members" WHERE "id" = NEW."orderMemberId";
    IF member_scope."registrationOrderId" <> NEW."registrationOrderId" OR member_scope."status" = 'CANCELLED' THEN RAISE EXCEPTION 'invalid post-registration member scope'; END IF;
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER "post_registration_assignment_scope_guard" BEFORE INSERT OR UPDATE ON "post_registration_form_assignments"
FOR EACH ROW EXECUTE FUNCTION enforce_post_registration_assignment_scope();

CREATE OR REPLACE FUNCTION enforce_post_registration_snapshot_immutable() RETURNS trigger AS $$
BEGIN
  IF ROW(NEW."registrationOrderId", NEW."registrationFormId", NEW."logicalFormKey", NEW."orderMemberId", NEW."audience", NEW."isRequired", NEW."blocksCheckIn", NEW."orderIndex", NEW."opensAt", NEW."closesAt", NEW."assignedAt")
     IS DISTINCT FROM ROW(OLD."registrationOrderId", OLD."registrationFormId", OLD."logicalFormKey", OLD."orderMemberId", OLD."audience", OLD."isRequired", OLD."blocksCheckIn", OLD."orderIndex", OLD."opensAt", OLD."closesAt", OLD."assignedAt") THEN
    RAISE EXCEPTION 'post-registration assignment snapshot is immutable';
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER "post_registration_assignment_immutable_guard" BEFORE UPDATE ON "post_registration_form_assignments"
FOR EACH ROW EXECUTE FUNCTION enforce_post_registration_snapshot_immutable();

CREATE OR REPLACE FUNCTION enforce_post_registration_response_link() RETURNS trigger AS $$
DECLARE linked RECORD;
BEGIN
  IF NEW."responseId" IS NULL THEN RETURN NEW; END IF;
  SELECT "registrationOrderId", "registrationFormId", "orderMemberId", "assignmentAudience" INTO linked
  FROM "registration_form_submissions" WHERE "id" = NEW."responseId";
  IF linked."registrationOrderId" <> NEW."registrationOrderId" OR linked."registrationFormId" <> NEW."registrationFormId"
     OR linked."orderMemberId" IS DISTINCT FROM NEW."orderMemberId" OR linked."assignmentAudience" <> NEW."audience" THEN
    RAISE EXCEPTION 'post-registration response linkage is inconsistent';
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE CONSTRAINT TRIGGER "post_registration_response_link_guard" AFTER INSERT OR UPDATE ON "post_registration_form_assignments"
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION enforce_post_registration_response_link();

ALTER TABLE "registration_form_assignments" ADD CONSTRAINT "registration_form_assignments_blocks_checkin_check" CHECK (NOT "blocksCheckIn" OR "isRequired");
ALTER TABLE "registration_form_submissions" ADD CONSTRAINT "registration_form_submissions_correction_check" CHECK (("correctionDeadlineAt" IS NULL AND "correctionReason" IS NULL) OR ("correctionDeadlineAt" IS NOT NULL AND "correctionReason" IS NOT NULL));

CREATE OR REPLACE FUNCTION enforce_registration_assignment_routing() RETURNS trigger AS $$
DECLARE form_scope RECORD; package_scope RECORD;
BEGIN
  SELECT "subEventId", "stage" INTO form_scope FROM "registration_forms" WHERE "id" = NEW."registrationFormId";
  IF NEW."blocksCheckIn" AND (NOT NEW."isRequired" OR form_scope."stage" <> 'POST_REGISTRATION') THEN
    RAISE EXCEPTION 'blocksCheckIn requires a required post-registration form';
  END IF;
  IF NEW."ticketPackageId" IS NOT NULL THEN
    SELECT "subEventId" INTO package_scope FROM "ticket_packages" WHERE "id" = NEW."ticketPackageId";
    IF package_scope."subEventId" IS NULL OR package_scope."subEventId" <> form_scope."subEventId" THEN
      RAISE EXCEPTION 'form assignment package must belong to the same sub-event';
    END IF;
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER "registration_form_assignment_routing_guard"
BEFORE INSERT OR UPDATE ON "registration_form_assignments"
FOR EACH ROW EXECUTE FUNCTION enforce_registration_assignment_routing();
