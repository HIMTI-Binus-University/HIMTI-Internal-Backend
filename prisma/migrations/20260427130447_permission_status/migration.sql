-- CreateEnum
CREATE TYPE "PermissionStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- AlterTable
ALTER TABLE "permissions" ADD COLUMN     "status" "PermissionStatus" NOT NULL DEFAULT 'ACTIVE';
