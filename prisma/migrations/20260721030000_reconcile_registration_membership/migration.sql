-- Preserve values from the superseded registration fields before removing them.
UPDATE "users"
SET
  "outlookEmail" = COALESCE("outlookEmail", "binusEmail"),
  "outlookEmailVerified" = "outlookEmailVerified" OR "binusEmailVerified";

UPDATE "users" AS users
SET "regionId" = regions."id"
FROM "binus_regions" AS legacy_regions
JOIN "regions" AS regions ON LOWER(regions."name") = LOWER(legacy_regions."name")
WHERE users."regionId" IS NULL
  AND users."binusRegionId" = legacy_regions."id";

UPDATE "users"
SET "registrationCompletedAt" = COALESCE("updatedAt", "createdAt", CURRENT_TIMESTAMP)
WHERE "registrationCompletedAt" IS NULL
  AND "universityId" IS NOT NULL
  AND "studyProgramId" IS NOT NULL
  AND "regionId" IS NOT NULL;

UPDATE "membership_groups" AS groups
SET "binusRegionId" = regions."id"
FROM "binus_regions" AS legacy_regions
JOIN "regions" AS regions ON LOWER(regions."name") = LOWER(legacy_regions."name")
WHERE groups."binusRegionId" = legacy_regions."id";

DROP TABLE "binus_email_verifications";

ALTER TABLE "users" DROP CONSTRAINT "users_binusRegionId_fkey";
ALTER TABLE "users"
  DROP COLUMN "binusEmail",
  DROP COLUMN "binusEmailVerified",
  DROP COLUMN "binusEmailVerifiedAt",
  DROP COLUMN "binusRegionId";

DROP TABLE "binus_regions";

DROP INDEX "membership_groups_periodId_idx";
ALTER TABLE "membership_groups" RENAME COLUMN "binusRegionId" TO "regionId";
ALTER TABLE "membership_groups" ALTER COLUMN "regionId" TYPE TEXT;

CREATE UNIQUE INDEX "membership_periods_one_active_idx"
ON "membership_periods" ("isActive")
WHERE "isActive" = true;

CREATE INDEX "membership_groups_periodId_graduateBatch_regionId_idx"
ON "membership_groups"("periodId", "graduateBatch", "regionId");

CREATE INDEX "membership_groups_regionId_idx"
ON "membership_groups"("regionId");

ALTER TABLE "membership_groups"
ADD CONSTRAINT "membership_groups_regionId_fkey"
FOREIGN KEY ("regionId") REFERENCES "regions"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "membership_periods" ("id", "label", "isActive")
VALUES ('2026-2027', '2026/2027', true)
ON CONFLICT ("id") DO NOTHING;
