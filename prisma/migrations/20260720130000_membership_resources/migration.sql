CREATE TABLE "membership_periods" (
  "id" VARCHAR(100) NOT NULL,
  "label" VARCHAR(100) NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "membership_periods_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "membership_groups" (
  "id" VARCHAR(100) NOT NULL,
  "periodId" VARCHAR(100) NOT NULL,
  "title" VARCHAR(255) NOT NULL,
  "url" TEXT NOT NULL,
  "graduateBatch" VARCHAR(20),
  "binusRegionId" VARCHAR(100),
  CONSTRAINT "membership_groups_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "membership_contacts" (
  "id" VARCHAR(100) NOT NULL,
  "periodId" VARCHAR(100) NOT NULL,
  "areas" TEXT[],
  "name" VARCHAR(255) NOT NULL,
  "phoneNumber" VARCHAR(30) NOT NULL,
  "contactUrl" TEXT NOT NULL,
  CONSTRAINT "membership_contacts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "membership_groups_periodId_idx" ON "membership_groups"("periodId");
CREATE INDEX "membership_contacts_periodId_idx" ON "membership_contacts"("periodId");

ALTER TABLE "membership_groups" ADD CONSTRAINT "membership_groups_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "membership_periods"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "membership_contacts" ADD CONSTRAINT "membership_contacts_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "membership_periods"("id") ON DELETE CASCADE ON UPDATE CASCADE;
