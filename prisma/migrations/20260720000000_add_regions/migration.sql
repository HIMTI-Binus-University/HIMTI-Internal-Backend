-- Rename legacy seed values before adding the canonical options.
DELETE FROM "study_programs" AS legacy
WHERE legacy."name" = 'Computer Science Reguler'
  AND EXISTS (
    SELECT 1 FROM "study_programs" AS canonical
    WHERE canonical."name" = 'Computer Science - Regular Class'
  );

UPDATE "study_programs"
SET "name" = 'Computer Science - Regular Class', "shortName" = 'CS Regular'
WHERE "name" = 'Computer Science Reguler';

DELETE FROM "study_programs" AS legacy
WHERE legacy."name" = 'Computer Science Global'
  AND EXISTS (
    SELECT 1 FROM "study_programs" AS canonical
    WHERE canonical."name" = 'Computer Science - Global Class'
  );

UPDATE "study_programs"
SET "name" = 'Computer Science - Global Class', "shortName" = 'CS Global'
WHERE "name" = 'Computer Science Global';

-- CreateTable
CREATE TABLE "regions" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "shortName" VARCHAR(50),
    "status" "Status" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "regions_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "users" ADD COLUMN "regionId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "regions_name_key" ON "regions"("name");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "regions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
