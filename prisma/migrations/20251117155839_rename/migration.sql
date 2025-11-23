/*
  Warnings:

  - You are about to drop the `UrlShorter` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "UrlShorter" DROP CONSTRAINT "UrlShorter_urlDetailsId_fkey";

-- DropTable
DROP TABLE "UrlShorter";

-- CreateTable
CREATE TABLE "UrlShortener" (
    "linkShorterId" UUID NOT NULL,
    "shortCode" VARCHAR(5) NOT NULL,
    "originalUrl" VARCHAR(255) NOT NULL,
    "urlDetailsId" UUID NOT NULL,
    "status" CHAR(1) NOT NULL DEFAULT 'a',
    "createdAt" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" VARCHAR(100) NOT NULL,
    "updatedAt" TIMESTAMP(3),
    "updatedBy" VARCHAR(100),

    CONSTRAINT "UrlShortener_pkey" PRIMARY KEY ("linkShorterId")
);

-- CreateIndex
CREATE UNIQUE INDEX "UrlShortener_shortCode_key" ON "UrlShortener"("shortCode");

-- AddForeignKey
ALTER TABLE "UrlShortener" ADD CONSTRAINT "UrlShortener_urlDetailsId_fkey" FOREIGN KEY ("urlDetailsId") REFERENCES "UrlDetails"("urlDetailsId") ON DELETE RESTRICT ON UPDATE CASCADE;
