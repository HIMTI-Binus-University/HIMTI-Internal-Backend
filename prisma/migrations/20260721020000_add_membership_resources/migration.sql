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
    "regionId" TEXT,

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

CREATE UNIQUE INDEX "membership_periods_one_active_idx"
ON "membership_periods" ("isActive")
WHERE "isActive" = true;

CREATE INDEX "membership_groups_periodId_graduateBatch_regionId_idx"
ON "membership_groups"("periodId", "graduateBatch", "regionId");

CREATE INDEX "membership_groups_regionId_idx"
ON "membership_groups"("regionId");

CREATE INDEX "membership_contacts_periodId_idx"
ON "membership_contacts"("periodId");

ALTER TABLE "membership_groups"
ADD CONSTRAINT "membership_groups_periodId_fkey"
FOREIGN KEY ("periodId") REFERENCES "membership_periods"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "membership_groups"
ADD CONSTRAINT "membership_groups_regionId_fkey"
FOREIGN KEY ("regionId") REFERENCES "regions"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "membership_contacts"
ADD CONSTRAINT "membership_contacts_periodId_fkey"
FOREIGN KEY ("periodId") REFERENCES "membership_periods"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "membership_periods" ("id", "label", "isActive")
VALUES ('2026-2027', '2026/2027', true);
