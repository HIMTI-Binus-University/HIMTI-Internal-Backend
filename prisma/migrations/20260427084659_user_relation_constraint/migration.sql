/*
  Warnings:

  - Made the column `createdBy` on table `permissions` required. This step will fail if there are existing NULL values in that column.
  - Made the column `createdBy` on table `roles` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "permissions" ALTER COLUMN "createdBy" SET NOT NULL;

-- AlterTable
ALTER TABLE "roles" ALTER COLUMN "createdBy" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "roles" ADD CONSTRAINT "roles_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permissions" ADD CONSTRAINT "permissions_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
