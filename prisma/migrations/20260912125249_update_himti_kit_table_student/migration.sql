/*
  Warnings:

  - You are about to drop the column `major` on the `HimtiKitResource` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "HimtiKitResource" DROP COLUMN "major";

-- DropEnum
DROP TYPE "MajorHIMTIKit";

-- CreateTable
CREATE TABLE "HimtiKitStudent" (
    "id" TEXT NOT NULL,
    "nim" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "createdAt" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "HimtiKitStudent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HimtiKitStudent_nim_key" ON "HimtiKitStudent"("nim");

-- CreateIndex
CREATE UNIQUE INDEX "HimtiKitStudent_email_key" ON "HimtiKitStudent"("email");
