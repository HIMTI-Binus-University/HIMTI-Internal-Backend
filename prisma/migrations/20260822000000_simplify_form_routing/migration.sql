ALTER TABLE "registration_forms"
ADD COLUMN "audience" "RegistrationFormAudience" NOT NULL DEFAULT 'BUYER',
ADD COLUMN "isRequired" BOOLEAN NOT NULL DEFAULT TRUE,
ADD COLUMN "opensAt" TIMESTAMP(3),
ADD COLUMN "closesAt" TIMESTAMP(3),
ADD COLUMN "blocksCheckIn" BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN "orderIndex" INTEGER NOT NULL DEFAULT 0;

-- Pick one deterministic legacy route per form. Package-specific routes sort
-- before defaults, then by display order and stable id.
WITH ranked_routes AS (
  SELECT a.*, ROW_NUMBER() OVER (
    PARTITION BY a."registrationFormId"
    ORDER BY (a."ticketPackageId" IS NULL), a."orderIndex", a."id"
  ) AS route_rank
  FROM "registration_form_assignments" a
)
UPDATE "registration_forms" f
SET "audience" = CASE
      WHEN f."stage" = 'REGISTRATION' THEN 'BUYER'::"RegistrationFormAudience"
      WHEN r."audience" = 'ALL_ORDER_MEMBERS' THEN 'EACH_ATTENDEE'::"RegistrationFormAudience"
      ELSE COALESCE(r."audience", 'BUYER'::"RegistrationFormAudience")
    END,
    "isRequired" = CASE WHEN f."stage" = 'REGISTRATION' THEN TRUE ELSE COALESCE(r."isRequired", TRUE) END,
    "opensAt" = CASE WHEN f."stage" = 'REGISTRATION' THEN NULL ELSE r."opensAt" END,
    "closesAt" = CASE WHEN f."stage" = 'REGISTRATION' THEN NULL ELSE r."closesAt" END,
    "blocksCheckIn" = CASE
      WHEN f."stage" = 'POST_REGISTRATION' AND COALESCE(r."isRequired", TRUE)
      THEN COALESCE(r."blocksCheckIn", FALSE)
      ELSE FALSE
    END,
    "orderIndex" = COALESCE(r."orderIndex", 0)
FROM ranked_routes r
WHERE r."registrationFormId" = f."id" AND r.route_rank = 1;

-- Resolve pre-existing duplicates before enforcing the single published
-- registration form invariant. The newest publication remains active.
WITH ranked_forms AS (
  SELECT "id", ROW_NUMBER() OVER (
    PARTITION BY "subEventId"
    ORDER BY "publishedAt" DESC NULLS LAST, "version" DESC, "createdAt" DESC, "id" DESC
  ) AS publication_rank
  FROM "registration_forms"
  WHERE "stage" = 'REGISTRATION' AND "status" = 'PUBLISHED' AND "deletedAt" IS NULL
)
UPDATE "registration_forms" f
SET "status" = 'CLOSED'
FROM ranked_forms r
WHERE f."id" = r."id" AND r.publication_rank > 1;

CREATE UNIQUE INDEX "registration_forms_one_published_registration_per_subevent_idx"
ON "registration_forms"("subEventId")
WHERE "stage" = 'REGISTRATION' AND "status" = 'PUBLISHED' AND "deletedAt" IS NULL;

ALTER TABLE "registration_forms" ADD CONSTRAINT "registration_forms_configuration_check" CHECK (
  ("stage" = 'REGISTRATION' AND "audience" = 'BUYER' AND "isRequired" = TRUE
    AND "blocksCheckIn" = FALSE AND "opensAt" IS NULL AND "closesAt" IS NULL)
  OR
  ("stage" <> 'REGISTRATION' AND "audience" <> 'ALL_ORDER_MEMBERS'
    AND ("blocksCheckIn" = FALSE OR "isRequired" = TRUE)
    AND ("opensAt" IS NULL OR "closesAt" IS NULL OR "opensAt" < "closesAt"))
);
