/*
  Warnings:

  - You are about to drop the `Events` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Participants` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Roles` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Url` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `UrlDetails` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Users` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "EventVisibility" AS ENUM ('PUBLIC', 'PRIVATE');

-- CreateEnum
CREATE TYPE "IsOnsite" AS ENUM ('ONLINE', 'OFFLINE', 'HYBRID');

-- DropForeignKey
ALTER TABLE "Participants" DROP CONSTRAINT "Participants_eventId_fkey";

-- DropForeignKey
ALTER TABLE "UrlDetails" DROP CONSTRAINT "UrlDetails_urlId_fkey";

-- DropForeignKey
ALTER TABLE "Users" DROP CONSTRAINT "Users_roleId_fkey";

-- DropTable
DROP TABLE "Events";

-- DropTable
DROP TABLE "Participants";

-- DropTable
DROP TABLE "Roles";

-- DropTable
DROP TABLE "Url";

-- DropTable
DROP TABLE "UrlDetails";

-- DropTable
DROP TABLE "Users";

-- CreateTable
CREATE TABLE "users" (
    "userId" UUID NOT NULL,
    "email" VARCHAR(100) NOT NULL,
    "roleId" UUID,
    "status" CHAR(1) NOT NULL DEFAULT 'a',
    "createdAt" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" VARCHAR(100) NOT NULL,
    "updatedAt" TIMESTAMP(3),
    "updatedBy" VARCHAR(100),

    CONSTRAINT "users_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "roles" (
    "roleId" UUID NOT NULL,
    "roleName" VARCHAR(255) NOT NULL,
    "status" CHAR(1) NOT NULL,
    "createdAt" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" VARCHAR(100) NOT NULL,
    "updatedAt" TIMESTAMP(3),
    "updatedBy" VARCHAR(100),

    CONSTRAINT "roles_pkey" PRIMARY KEY ("roleId")
);

-- CreateTable
CREATE TABLE "urls" (
    "urlId" UUID NOT NULL,
    "shortCode" VARCHAR(21) NOT NULL,
    "originalUrl" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "status" CHAR(1) NOT NULL DEFAULT 'a',
    "createdAt" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" VARCHAR(100) NOT NULL,
    "updatedAt" TIMESTAMP(3),
    "updatedBy" VARCHAR(100),

    CONSTRAINT "urls_pkey" PRIMARY KEY ("urlId")
);

-- CreateTable
CREATE TABLE "url_details" (
    "urlDetailsId" UUID NOT NULL,
    "urlId" UUID NOT NULL,
    "ip" VARCHAR(255),
    "userAgent" VARCHAR(255),
    "country" VARCHAR(255),
    "region" VARCHAR(255),
    "city" VARCHAR(255),
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "isp" VARCHAR(255),
    "timezone" VARCHAR(255),

    CONSTRAINT "url_details_pkey" PRIMARY KEY ("urlDetailsId")
);

-- CreateTable
CREATE TABLE "events" (
    "eventId" UUID NOT NULL,
    "eventName" VARCHAR(255) NOT NULL,
    "eventKicker" VARCHAR(255) NOT NULL,
    "eventDesc" TEXT NOT NULL,
    "eventDate" TIMESTAMP(3) NOT NULL,
    "eventLocation" VARCHAR(255) NOT NULL,
    "eventPriceOnline" INTEGER NOT NULL,
    "eventPriceOffline" INTEGER NOT NULL,
    "isOnsite" "IsOnsite" NOT NULL,
    "eventVisibility" "EventVisibility" NOT NULL,
    "status" CHAR(1) NOT NULL DEFAULT 'a',
    "createdAt" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" VARCHAR(100) NOT NULL,
    "updatedAt" TIMESTAMP(3),
    "updatedBy" VARCHAR(100),

    CONSTRAINT "events_pkey" PRIMARY KEY ("eventId")
);

-- CreateTable
CREATE TABLE "event_has_participants" (
    "eventId" UUID NOT NULL,
    "participantId" UUID NOT NULL,

    CONSTRAINT "event_has_participants_pkey" PRIMARY KEY ("eventId","participantId")
);

-- CreateTable
CREATE TABLE "participants" (
    "participantId" UUID NOT NULL,
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

    CONSTRAINT "participants_pkey" PRIMARY KEY ("participantId")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "urls_shortCode_key" ON "urls"("shortCode");

-- CreateIndex
CREATE UNIQUE INDEX "participants_email_key" ON "participants"("email");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("roleId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "url_details" ADD CONSTRAINT "url_details_urlId_fkey" FOREIGN KEY ("urlId") REFERENCES "urls"("urlId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_has_participants" ADD CONSTRAINT "event_has_participants_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("eventId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_has_participants" ADD CONSTRAINT "event_has_participants_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "participants"("participantId") ON DELETE RESTRICT ON UPDATE CASCADE;
