/*
  Warnings:

  - You are about to drop the `HimtiKitSfotware` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "HimtiKitSfotware";

-- CreateTable
CREATE TABLE "HimtiKitSoftware" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "downloadUrl" TEXT NOT NULL,
    "coverImageUrl" TEXT,
    "createdAt" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "HimtiKitSoftware_pkey" PRIMARY KEY ("id")
);
