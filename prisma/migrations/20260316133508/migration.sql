/*
  Warnings:

  - You are about to drop the column `eventId` on the `registration_forms` table. All the data in the column will be lost.
  - Added the required column `subEventId` to the `registration_forms` table without a default value. This is not possible if the table is not empty.
  - Added the required column `paymentAccountBank` to the `subevents` table without a default value. This is not possible if the table is not empty.
  - Added the required column `paymentDesc` to the `subevents` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "registration_forms" DROP CONSTRAINT "registration_forms_eventId_fkey";

-- AlterTable
ALTER TABLE "registration_forms" DROP COLUMN "eventId",
ADD COLUMN     "subEventId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "subevents" ADD COLUMN     "paid" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "paymentAccountBank" VARCHAR(100) NOT NULL,
ADD COLUMN     "paymentAccountName" VARCHAR(100),
ADD COLUMN     "paymentAccountNumber" INTEGER,
ADD COLUMN     "paymentDesc" VARCHAR(255) NOT NULL,
ADD COLUMN     "priceModifier" INTEGER;

-- AddForeignKey
ALTER TABLE "registration_forms" ADD CONSTRAINT "registration_forms_subEventId_fkey" FOREIGN KEY ("subEventId") REFERENCES "subevents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
