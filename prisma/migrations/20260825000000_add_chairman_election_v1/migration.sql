-- CreateEnum
CREATE TYPE "ElectionStatus" AS ENUM ('DRAFT', 'OPEN', 'CLOSED', 'PUBLISHED');

-- CreateTable
CREATE TABLE "elections" (
    "id" TEXT NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "status" "ElectionStatus" NOT NULL DEFAULT 'DRAFT',
    "startsAt" TIMESTAMP(0) NOT NULL,
    "endsAt" TIMESTAMP(0) NOT NULL,
    "openedAt" TIMESTAMP(0),
    "closedAt" TIMESTAMP(0),
    "publishedAt" TIMESTAMP(0),
    "createdAt" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" VARCHAR(100) NOT NULL,
    "updatedAt" TIMESTAMP(3),
    "updatedBy" VARCHAR(100),

    CONSTRAINT "elections_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "elections_time_window_check" CHECK ("startsAt" < "endsAt"),
    CONSTRAINT "elections_state_timestamps_check" CHECK (
      ("status" = 'DRAFT' AND "openedAt" IS NULL AND "closedAt" IS NULL AND "publishedAt" IS NULL)
      OR ("status" = 'OPEN' AND "openedAt" IS NOT NULL AND "closedAt" IS NULL AND "publishedAt" IS NULL)
      OR ("status" = 'CLOSED' AND "openedAt" IS NOT NULL AND "closedAt" IS NOT NULL AND "publishedAt" IS NULL)
      OR ("status" = 'PUBLISHED' AND "openedAt" IS NOT NULL AND "closedAt" IS NOT NULL AND "publishedAt" IS NOT NULL)
    )
);

-- CreateTable
CREATE TABLE "election_candidates" (
    "id" TEXT NOT NULL,
    "electionId" TEXT NOT NULL,
    "ballotNumber" INTEGER NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "photoUrl" TEXT,
    "biography" TEXT,
    "vision" TEXT NOT NULL,
    "mission" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "election_candidates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "election_participations" (
    "electionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "receiptCode" VARCHAR(64) NOT NULL,
    "votedAt" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "election_participations_pkey" PRIMARY KEY ("electionId", "userId")
);

-- CreateTable
CREATE TABLE "election_ballots" (
    "id" TEXT NOT NULL,
    "electionId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,

    CONSTRAINT "election_ballots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "elections_slug_key" ON "elections"("slug");
CREATE INDEX "elections_status_startsAt_idx" ON "elections"("status", "startsAt");
CREATE UNIQUE INDEX "elections_one_open_idx" ON "elections" ((1)) WHERE "status" = 'OPEN';
CREATE UNIQUE INDEX "election_candidates_electionId_ballotNumber_key" ON "election_candidates"("electionId", "ballotNumber");
CREATE UNIQUE INDEX "election_candidates_id_electionId_key" ON "election_candidates"("id", "electionId");
CREATE INDEX "election_candidates_electionId_isActive_position_idx" ON "election_candidates"("electionId", "isActive", "position");
CREATE UNIQUE INDEX "election_participations_receiptCode_key" ON "election_participations"("receiptCode");
CREATE INDEX "election_participations_userId_idx" ON "election_participations"("userId");
CREATE INDEX "election_ballots_electionId_idx" ON "election_ballots"("electionId");
CREATE INDEX "election_ballots_candidateId_idx" ON "election_ballots"("candidateId");

-- AddForeignKey
ALTER TABLE "elections" ADD CONSTRAINT "elections_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "elections" ADD CONSTRAINT "elections_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "election_candidates" ADD CONSTRAINT "election_candidates_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "elections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "election_participations" ADD CONSTRAINT "election_participations_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "elections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "election_participations" ADD CONSTRAINT "election_participations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "election_ballots" ADD CONSTRAINT "election_ballots_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "elections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "election_ballots" ADD CONSTRAINT "election_ballots_candidateId_electionId_fkey" FOREIGN KEY ("candidateId", "electionId") REFERENCES "election_candidates"("id", "electionId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Election permissions are provisioned during migration so deploy flows that
-- do not run the seed still receive the required rows and Admin grants.
WITH admin_creator AS (
    SELECT u."id"
    FROM "users" u
    LEFT JOIN "user_has_roles" uhr ON uhr."userId" = u."id"
    LEFT JOIN "roles" r ON r."id" = uhr."roleId" AND r."roleName" = 'Admin'
    ORDER BY (r."id" IS NOT NULL) DESC, u."createdAt" ASC
    LIMIT 1
), inserted_permissions AS (
    INSERT INTO "permissions" ("id", "name", "status", "createdAt", "createdBy")
    SELECT 'election-manage-v1', 'manage_elections', 'ACTIVE'::"Status", CURRENT_TIMESTAMP, "id" FROM admin_creator
    UNION ALL
    SELECT 'election-results-v1', 'view_election_results', 'ACTIVE'::"Status", CURRENT_TIMESTAMP, "id" FROM admin_creator
    ON CONFLICT ("name") DO UPDATE SET "status" = 'ACTIVE'::"Status"
    RETURNING "id", "name"
)
INSERT INTO "role_has_permissions" ("roleId", "permissionId", "assignedAt")
SELECT r."id", p."id", CURRENT_TIMESTAMP
FROM "roles" r
CROSS JOIN inserted_permissions p
WHERE r."roleName" = 'Admin'
ON CONFLICT ("roleId", "permissionId") DO NOTHING;
