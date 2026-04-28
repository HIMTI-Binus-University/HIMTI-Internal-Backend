/*
  Warnings:

  - You are about to drop the column `status` on the `permissions` table. All the data in the column will be lost.
  - The `status` column on the `urls` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `users` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "Status" AS ENUM ('ACTIVE', 'INACTIVE');

-- DropForeignKey
ALTER TABLE "permissions" DROP CONSTRAINT "permissions_createdBy_fkey";

-- DropForeignKey
ALTER TABLE "roles" DROP CONSTRAINT "roles_createdBy_fkey";

-- AlterTable
ALTER TABLE "permissions" DROP COLUMN "status",
ALTER COLUMN "createdBy" DROP NOT NULL;

-- AlterTable
ALTER TABLE "roles" ALTER COLUMN "createdBy" DROP NOT NULL;

-- AlterTable
ALTER TABLE "urls" DROP COLUMN "status",
ADD COLUMN     "status" "Status" NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "users" DROP COLUMN "status",
ADD COLUMN     "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE';

-- DropEnum
DROP TYPE "PermissionStatus";
