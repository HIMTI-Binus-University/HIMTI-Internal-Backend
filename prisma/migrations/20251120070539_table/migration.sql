/*
  Warnings:

  - You are about to drop the column `urlShortenerId` on the `UrlDetails` table. All the data in the column will be lost.
  - You are about to drop the `EmailParticipants` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `UrlShortener` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `urlId` to the `UrlDetails` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "EmailParticipants" DROP CONSTRAINT "EmailParticipants_eventId_fkey";

-- DropForeignKey
ALTER TABLE "UrlDetails" DROP CONSTRAINT "UrlDetails_urlShortenerId_fkey";

-- AlterTable
ALTER TABLE "UrlDetails" DROP COLUMN "urlShortenerId",
ADD COLUMN     "urlId" UUID NOT NULL;

-- DropTable
DROP TABLE "EmailParticipants";

-- DropTable
DROP TABLE "UrlShortener";

-- CreateTable
CREATE TABLE "Url" (
    "urlId" UUID NOT NULL,
    "shortCode" VARCHAR(5) NOT NULL,
    "originalUrl" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "status" CHAR(1) NOT NULL DEFAULT 'a',
    "createdAt" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" VARCHAR(100) NOT NULL,
    "updatedAt" TIMESTAMP(3),
    "updatedBy" VARCHAR(100),

    CONSTRAINT "Url_pkey" PRIMARY KEY ("urlId")
);

-- CreateTable
CREATE TABLE "Participants" (
    "emailParticipantId" UUID NOT NULL,
    "eventId" UUID NOT NULL,
    "username" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(255) NOT NULL,
    "binusian" VARCHAR(255) NOT NULL,
    "region" VARCHAR(255) NOT NULL,
    "jurusan" VARCHAR(100) NOT NULL,
    "email" VARCHAR(100) NOT NULL,
    "nim" INTEGER NOT NULL,
    "status" CHAR(1) NOT NULL DEFAULT 'a',
    "createdAt" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" VARCHAR(100) NOT NULL,
    "updatedAt" TIMESTAMP(3),
    "updatedBy" VARCHAR(100),

    CONSTRAINT "Participants_pkey" PRIMARY KEY ("emailParticipantId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Url_shortCode_key" ON "Url"("shortCode");

-- CreateIndex
CREATE UNIQUE INDEX "Participants_email_key" ON "Participants"("email");

-- AddForeignKey
ALTER TABLE "UrlDetails" ADD CONSTRAINT "UrlDetails_urlId_fkey" FOREIGN KEY ("urlId") REFERENCES "Url"("urlId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Participants" ADD CONSTRAINT "Participants_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Events"("eventId") ON DELETE RESTRICT ON UPDATE CASCADE;
