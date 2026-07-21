-- Forward migration for the public registration schema. Existing migration
-- history does not contain these registration fields or the verification table.
DO $$ BEGIN
  CREATE TYPE "MemberType" AS ENUM ('STUDENT', 'LECTURER', 'OTHER');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "InstitutionType" AS ENUM ('BINUS', 'NON_BINUS');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "binusEmail" VARCHAR(100),
  ADD COLUMN IF NOT EXISTS "binusEmailVerified" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "binusEmailVerifiedAt" TIMESTAMP(0),
  ADD COLUMN IF NOT EXISTS "binusRegionId" TEXT,
  ADD COLUMN IF NOT EXISTS "memberType" "MemberType",
  ADD COLUMN IF NOT EXISTS "institutionType" "InstitutionType",
  ADD COLUMN IF NOT EXISTS "universityName" VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "studyProgramName" VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "department" VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "affiliation" VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "registrationCompletedAt" TIMESTAMP(0);

CREATE TABLE IF NOT EXISTS "binus_regions" (
  "id" TEXT NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "status" "Status" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3),
  CONSTRAINT "binus_regions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "binus_regions_name_key" ON "binus_regions"("name");

CREATE UNIQUE INDEX IF NOT EXISTS "users_binusEmail_key" ON "users"("binusEmail");

CREATE TABLE IF NOT EXISTS "binus_email_verifications" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "email" VARCHAR(100) NOT NULL,
  "tokenHash" VARCHAR(64) NOT NULL,
  "expiresAt" TIMESTAMP(0) NOT NULL,
  "usedAt" TIMESTAMP(0),
  "createdAt" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "binus_email_verifications_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "binus_email_verifications_tokenHash_key" UNIQUE ("tokenHash"),
  CONSTRAINT "binus_email_verifications_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "binus_email_verifications_userId_email_createdAt_idx"
  ON "binus_email_verifications"("userId", "email", "createdAt");

DO $$ BEGIN
  ALTER TABLE "users" ADD CONSTRAINT "users_binusRegionId_fkey"
    FOREIGN KEY ("binusRegionId") REFERENCES "binus_regions"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
