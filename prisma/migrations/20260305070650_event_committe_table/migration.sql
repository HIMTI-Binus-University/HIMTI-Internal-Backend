-- CreateEnum
CREATE TYPE "CommitteeRole" AS ENUM ('CHAIRPERSON', 'VICE_CHAIRPERSON', 'SECRETARY', 'TREASURER', 'COORDINATOR', 'STAFF');

-- CreateTable
CREATE TABLE "event_committees" (
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "CommitteeRole" NOT NULL DEFAULT 'STAFF',
    "assignedAt" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_committees_pkey" PRIMARY KEY ("eventId","userId")
);

-- AddForeignKey
ALTER TABLE "event_committees" ADD CONSTRAINT "event_committees_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_committees" ADD CONSTRAINT "event_committees_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
