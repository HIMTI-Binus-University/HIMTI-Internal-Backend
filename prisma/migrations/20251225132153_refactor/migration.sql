/*
  Warnings:

  - The primary key for the `event_has_participants` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `events` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `participants` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `url_details` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `urls` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- DropForeignKey
ALTER TABLE "event_has_participants" DROP CONSTRAINT "event_has_participants_eventId_fkey";

-- DropForeignKey
ALTER TABLE "event_has_participants" DROP CONSTRAINT "event_has_participants_participantId_fkey";

-- DropForeignKey
ALTER TABLE "url_details" DROP CONSTRAINT "url_details_urlId_fkey";

-- AlterTable
ALTER TABLE "event_has_participants" DROP CONSTRAINT "event_has_participants_pkey",
ALTER COLUMN "eventId" SET DATA TYPE TEXT,
ALTER COLUMN "participantId" SET DATA TYPE TEXT,
ADD CONSTRAINT "event_has_participants_pkey" PRIMARY KEY ("eventId", "participantId");

-- AlterTable
ALTER TABLE "events" DROP CONSTRAINT "events_pkey",
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "events_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "participants" DROP CONSTRAINT "participants_pkey",
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "eventId" SET DATA TYPE TEXT,
ADD CONSTRAINT "participants_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "url_details" DROP CONSTRAINT "url_details_pkey",
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "urlId" SET DATA TYPE TEXT,
ADD CONSTRAINT "url_details_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "urls" DROP CONSTRAINT "urls_pkey",
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "urls_pkey" PRIMARY KEY ("id");

-- AddForeignKey
ALTER TABLE "url_details" ADD CONSTRAINT "url_details_urlId_fkey" FOREIGN KEY ("urlId") REFERENCES "urls"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_has_participants" ADD CONSTRAINT "event_has_participants_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_has_participants" ADD CONSTRAINT "event_has_participants_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "participants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
