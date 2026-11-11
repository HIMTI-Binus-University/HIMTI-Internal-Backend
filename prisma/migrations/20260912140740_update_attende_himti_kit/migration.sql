/*
  Warnings:

  - You are about to drop the `eligible_attendees` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterTable
ALTER TABLE "HimtiKitResource" ALTER COLUMN "description" DROP NOT NULL;

-- DropTable
DROP TABLE "eligible_attendees";

-- CreateTable
CREATE TABLE "HimtiKitAttendee" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nim" TEXT NOT NULL,
    "createdAt" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "HimtiKitAttendee_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HimtiKitAttendee_nim_key" ON "HimtiKitAttendee"("nim");
