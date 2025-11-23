/*
  Warnings:

  - The primary key for the `UrlShortener` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `linkShorterId` on the `UrlShortener` table. All the data in the column will be lost.
  - The required column `urlShortenerId` was added to the `UrlShortener` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

*/
-- AlterTable
ALTER TABLE "UrlShortener" DROP CONSTRAINT "UrlShortener_pkey",
DROP COLUMN "linkShorterId",
ADD COLUMN     "urlShortenerId" UUID NOT NULL,
ADD CONSTRAINT "UrlShortener_pkey" PRIMARY KEY ("urlShortenerId");
