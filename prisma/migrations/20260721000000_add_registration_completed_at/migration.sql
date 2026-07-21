ALTER TABLE "users"
ADD COLUMN "registrationCompletedAt" TIMESTAMP(0);

UPDATE "users"
SET "registrationCompletedAt" = COALESCE("updatedAt", "createdAt", CURRENT_TIMESTAMP)
WHERE "universityId" IS NOT NULL
  AND "studyProgramId" IS NOT NULL
  AND "regionId" IS NOT NULL;
