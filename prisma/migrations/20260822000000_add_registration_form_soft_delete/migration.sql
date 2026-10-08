ALTER TABLE "registration_forms"
ADD COLUMN "deletedAt" TIMESTAMP(0),
ADD COLUMN "deletedBy" VARCHAR(100);

CREATE INDEX "registration_forms_deletedBy_idx" ON "registration_forms"("deletedBy");

ALTER TABLE "registration_forms"
ADD CONSTRAINT "registration_forms_deletedBy_fkey"
FOREIGN KEY ("deletedBy") REFERENCES "users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
