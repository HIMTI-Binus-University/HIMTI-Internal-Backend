ALTER TABLE "membership_periods"
ADD COLUMN "registrationOpen" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "user_membership_periods" (
    "userId" TEXT NOT NULL,
    "periodId" VARCHAR(100) NOT NULL,
    "joinedAt" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isCurrent" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "user_membership_periods_pkey" PRIMARY KEY ("userId", "periodId")
);

CREATE TABLE "membership_resources" (
    "id" TEXT NOT NULL,
    "periodId" VARCHAR(100) NOT NULL,
    "regionId" TEXT,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "url" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "membership_resources_pkey" PRIMARY KEY ("id")
);

INSERT INTO "user_membership_periods" ("userId", "periodId", "joinedAt", "isCurrent")
SELECT users."id", periods."id", COALESCE(users."registrationCompletedAt", CURRENT_TIMESTAMP), true
FROM "users" AS users
CROSS JOIN "membership_periods" AS periods
WHERE users."registrationCompletedAt" IS NOT NULL
  AND periods."isActive" = true;

INSERT INTO "membership_resources" ("id", "periodId", "regionId", "title", "description", "url", "position")
SELECT
    'group-' || groups."id",
    groups."periodId",
    groups."regionId",
    groups."title",
    '',
    groups."url",
    ROW_NUMBER() OVER (PARTITION BY groups."periodId" ORDER BY groups."title", groups."id") - 1
FROM "membership_groups" AS groups;

INSERT INTO "membership_resources" ("id", "periodId", "regionId", "title", "description", "url", "position")
SELECT
    'contact-' || contacts."id",
    contacts."periodId",
    NULL,
    contacts."name",
    CONCAT_WS(' - ', NULLIF(contacts."phoneNumber", ''), NULLIF(ARRAY_TO_STRING(contacts."areas", ', '), '')),
    contacts."contactUrl",
    (SELECT COUNT(*) FROM "membership_groups" AS groups WHERE groups."periodId" = contacts."periodId")
      + ROW_NUMBER() OVER (PARTITION BY contacts."periodId" ORDER BY contacts."name", contacts."id") - 1
FROM "membership_contacts" AS contacts;

DROP TABLE "membership_groups";
DROP TABLE "membership_contacts";

CREATE UNIQUE INDEX "user_membership_periods_one_current_idx"
ON "user_membership_periods" ("userId")
WHERE "isCurrent" = true;

CREATE INDEX "user_membership_periods_userId_isCurrent_idx"
ON "user_membership_periods"("userId", "isCurrent");

CREATE INDEX "user_membership_periods_periodId_idx"
ON "user_membership_periods"("periodId");

CREATE INDEX "membership_resources_periodId_position_idx"
ON "membership_resources"("periodId", "position");

CREATE INDEX "membership_resources_regionId_idx"
ON "membership_resources"("regionId");

ALTER TABLE "user_membership_periods"
ADD CONSTRAINT "user_membership_periods_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_membership_periods"
ADD CONSTRAINT "user_membership_periods_periodId_fkey"
FOREIGN KEY ("periodId") REFERENCES "membership_periods"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "membership_resources"
ADD CONSTRAINT "membership_resources_periodId_fkey"
FOREIGN KEY ("periodId") REFERENCES "membership_periods"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "membership_resources"
ADD CONSTRAINT "membership_resources_regionId_fkey"
FOREIGN KEY ("regionId") REFERENCES "regions"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "permissions" ("id", "name", "status", "createdAt", "createdBy")
SELECT 'permission-manage-batch', 'manage_batch', 'ACTIVE', CURRENT_TIMESTAMP, users."id"
FROM "users" AS users
ORDER BY users."createdAt", users."id"
LIMIT 1
ON CONFLICT ("name") DO NOTHING;

INSERT INTO "role_has_permissions" ("roleId", "permissionId", "assignedAt")
SELECT roles."id", permissions."id", CURRENT_TIMESTAMP
FROM "roles" AS roles
CROSS JOIN "permissions" AS permissions
WHERE roles."roleName" = 'Admin'
  AND permissions."name" = 'manage_batch'
ON CONFLICT ("roleId", "permissionId") DO NOTHING;
