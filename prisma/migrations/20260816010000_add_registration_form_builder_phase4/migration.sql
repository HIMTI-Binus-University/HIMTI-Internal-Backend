-- Add optimistic locking and explicit question validation metadata without
-- changing any existing form version or response.
ALTER TABLE "registration_forms"
ADD COLUMN "revision" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "form_questions"
ADD COLUMN "validation" JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE "registration_form_sections"
ADD COLUMN "status" "FormQuestionStatus" NOT NULL DEFAULT 'ACTIVE';

ALTER TABLE "registration_forms"
ADD CONSTRAINT "registration_forms_revision_check" CHECK ("revision" > 0);

CREATE INDEX "registration_forms_logicalKey_version_idx"
ON "registration_forms"("logicalKey", "version");

CREATE INDEX "registration_form_sections_form_status_order_idx"
ON "registration_form_sections"("registrationFormId", "status", "orderIndex");

-- Fail fast if deployed data already violates either lifecycle invariant. No
-- rows are rewritten or discarded by these indexes.
CREATE UNIQUE INDEX "registration_forms_one_published_logical_version_idx"
ON "registration_forms"("subEventId", "logicalKey")
WHERE "status" = 'PUBLISHED' AND "logicalKey" IS NOT NULL;

CREATE UNIQUE INDEX "form_questions_active_field_key_idx"
ON "form_questions"("registrationFormId", "fieldKey")
WHERE "status" = 'ACTIVE';
