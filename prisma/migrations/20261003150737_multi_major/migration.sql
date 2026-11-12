/*
  Warnings:

  - You are about to drop the column `major` on the `HimtiKitResource` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "HimtiKitResource" ADD COLUMN "majors" "MajorHIMTIKit"[];
UPDATE "HimtiKitResource" SET "majors" = ARRAY["major"];
ALTER TABLE "HimtiKitResource" DROP COLUMN "major";
