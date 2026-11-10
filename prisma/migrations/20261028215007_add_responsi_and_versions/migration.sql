-- CreateEnum
CREATE TYPE "ResponsiStatus" AS ENUM ('DRAFT', 'UNDER_REVIEW', 'PUBLISHED', 'ARCHIVED');

-- DropForeignKey
ALTER TABLE "attendance_check_ins" DROP CONSTRAINT "attendance_check_ins_ticket_event_scope_fkey";

-- DropForeignKey
ALTER TABLE "registration_tickets" DROP CONSTRAINT "registration_tickets_member_event_scope_fkey";

-- CreateTable
CREATE TABLE "responsies" (
    "id" TEXT NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "courseId" TEXT NOT NULL,
    "academicPeriod" VARCHAR(50) NOT NULL,
    "semester" INTEGER,
    "examType" VARCHAR(50) NOT NULL,
    "status" "ResponsiStatus" NOT NULL DEFAULT 'DRAFT',
    "pic" VARCHAR(255) NOT NULL,
    "content" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "responsies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "responsi_versions" (
    "id" TEXT NOT NULL,
    "responsiId" TEXT NOT NULL,
    "version" VARCHAR(20) NOT NULL,
    "content" TEXT NOT NULL,
    "status" "ResponsiStatus" NOT NULL,
    "createdBy" VARCHAR(255),
    "createdAt" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "responsi_versions_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "responsies" ADD CONSTRAINT "responsies_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "responsi_versions" ADD CONSTRAINT "responsi_versions_responsiId_fkey" FOREIGN KEY ("responsiId") REFERENCES "responsies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
