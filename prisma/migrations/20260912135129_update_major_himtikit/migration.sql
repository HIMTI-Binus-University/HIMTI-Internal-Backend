/*
  Warnings:

  - You are about to drop the `HimtiKitStudent` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `major` to the `HimtiKitResource` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "MajorHIMTIKit" AS ENUM ('COMPUTER_SCIENCE', 'MOBILE_APPLICATION_AND_TECHNOLOGY', 'GAME_APPLICATION_AND_TECHNOLOGY', 'DATA_SCIENCE', 'CYBER_SECURITY', 'COMPUTER_SCIENCE_AND_MATHEMATICS', 'COMPUTER_SCIENCE_AND_STATISTIC', 'COMPUTER_SCIENCE_SOFTWARE_ENGINEERING', 'ARTIFICIAL_INTELLIGENCE', 'DIGITAL_PSYCHOLOGY');

-- AlterTable
ALTER TABLE "HimtiKitResource" ADD COLUMN     "major" "MajorHIMTIKit" NOT NULL;

-- DropTable
DROP TABLE "HimtiKitStudent";

-- CreateTable
CREATE TABLE "eligible_attendees" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nim" TEXT NOT NULL,
    "createdAt" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "eligible_attendees_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "eligible_attendees_nim_key" ON "eligible_attendees"("nim");
