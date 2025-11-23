/*
  Warnings:

  - You are about to drop the column `urlDetailsId` on the `UrlShortener` table. All the data in the column will be lost.
  - Added the required column `eventId` to the `EmailParticipants` table without a default value. This is not possible if the table is not empty.
  - Added the required column `urlShortenerId` to the `UrlDetails` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Events" DROP CONSTRAINT "Events_emailParticipantId_fkey";

-- DropForeignKey
ALTER TABLE "UrlShortener" DROP CONSTRAINT "UrlShortener_urlDetailsId_fkey";

-- AlterTable
ALTER TABLE "EmailParticipants" ADD COLUMN     "eventId" UUID NOT NULL;

-- AlterTable
ALTER TABLE "UrlDetails" ADD COLUMN     "urlShortenerId" UUID NOT NULL;

-- AlterTable
ALTER TABLE "UrlShortener" DROP COLUMN "urlDetailsId",
ALTER COLUMN "originalUrl" SET DATA TYPE TEXT;

-- AddForeignKey
ALTER TABLE "UrlDetails" ADD CONSTRAINT "UrlDetails_urlShortenerId_fkey" FOREIGN KEY ("urlShortenerId") REFERENCES "UrlShortener"("urlShortenerId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailParticipants" ADD CONSTRAINT "EmailParticipants_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Events"("eventId") ON DELETE RESTRICT ON UPDATE CASCADE;
