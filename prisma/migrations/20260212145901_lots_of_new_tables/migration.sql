/*
  Warnings:

  - The primary key for the `event_has_participants` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `participantId` on the `event_has_participants` table. All the data in the column will be lost.
  - You are about to drop the column `eventDate` on the `events` table. All the data in the column will be lost.
  - You are about to drop the column `eventDesc` on the `events` table. All the data in the column will be lost.
  - You are about to drop the column `eventKicker` on the `events` table. All the data in the column will be lost.
  - You are about to drop the column `eventLocation` on the `events` table. All the data in the column will be lost.
  - You are about to drop the column `eventName` on the `events` table. All the data in the column will be lost.
  - You are about to drop the column `eventPriceOffline` on the `events` table. All the data in the column will be lost.
  - You are about to drop the column `eventPriceOnline` on the `events` table. All the data in the column will be lost.
  - You are about to drop the column `eventVisibility` on the `events` table. All the data in the column will be lost.
  - You are about to drop the column `isOnsite` on the `events` table. All the data in the column will be lost.
  - The `status` column on the `events` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `roles` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `users` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the `Permission` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `participants` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `role_has_permission` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[eventId,userId,eventModeId]` on the table `event_has_participants` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `eventModeId` to the `event_has_participants` table without a default value. This is not possible if the table is not empty.
  - The required column `id` was added to the `event_has_participants` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.
  - Added the required column `userId` to the `event_has_participants` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `events` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "UniversityStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "StudyProgramStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "RoleStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CLOSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SubeventType" AS ENUM ('MAIN_EVENT', 'WORKSHOP', 'SEMINAR', 'COMPETITION', 'WELCOMING_PARTY', 'DOMESTIC_STUDY_TOUR', 'INTERNATIONAL_STUDY_TOUR', 'COMPANY_VISIT', 'OTHER');

-- CreateEnum
CREATE TYPE "SubeventVisibility" AS ENUM ('PUBLIC', 'INTERNAL', 'INVITE_ONLY');

-- CreateEnum
CREATE TYPE "SubeventStatus" AS ENUM ('DRAFT', 'OPEN', 'CLOSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RegistrationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('UNPAID', 'SUBMITTED', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "RegistrationResponseStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'LOCKED');

-- CreateEnum
CREATE TYPE "FormFieldType" AS ENUM ('TEXT', 'TEXTAREA', 'NUMBER', 'DATE', 'SELECT', 'RADIO', 'CHECKBOX', 'FILE');

-- CreateEnum
CREATE TYPE "FormQuestionStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "RegistrationFormStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CLOSED');

-- DropForeignKey
ALTER TABLE "event_has_participants" DROP CONSTRAINT "event_has_participants_participantId_fkey";

-- DropForeignKey
ALTER TABLE "role_has_permission" DROP CONSTRAINT "role_has_permission_permissionId_fkey";

-- DropForeignKey
ALTER TABLE "role_has_permission" DROP CONSTRAINT "role_has_permission_roleId_fkey";

-- DropForeignKey
ALTER TABLE "user_has_roles" DROP CONSTRAINT "user_has_roles_roleId_fkey";

-- DropForeignKey
ALTER TABLE "user_has_roles" DROP CONSTRAINT "user_has_roles_userId_fkey";

-- AlterTable
ALTER TABLE "event_has_participants" DROP CONSTRAINT "event_has_participants_pkey",
DROP COLUMN "participantId",
ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "approvedBy" VARCHAR(100),
ADD COLUMN     "createdAt" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "eventModeId" TEXT NOT NULL,
ADD COLUMN     "id" TEXT NOT NULL,
ADD COLUMN     "paymentProofUrl" TEXT,
ADD COLUMN     "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'UNPAID',
ADD COLUMN     "paymentSubmittedAt" TIMESTAMP(3),
ADD COLUMN     "paymentVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "paymentVerifiedBy" VARCHAR(100),
ADD COLUMN     "registrationStatus" "RegistrationStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "updatedAt" TIMESTAMP(3),
ADD COLUMN     "userId" TEXT NOT NULL,
ADD CONSTRAINT "event_has_participants_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "events" DROP COLUMN "eventDate",
DROP COLUMN "eventDesc",
DROP COLUMN "eventKicker",
DROP COLUMN "eventLocation",
DROP COLUMN "eventName",
DROP COLUMN "eventPriceOffline",
DROP COLUMN "eventPriceOnline",
DROP COLUMN "eventVisibility",
DROP COLUMN "isOnsite",
ADD COLUMN     "coverImageUrl" TEXT,
ADD COLUMN     "name" VARCHAR(255) NOT NULL,
ADD COLUMN     "publicDescription" TEXT,
DROP COLUMN "status",
ADD COLUMN     "status" "EventStatus" NOT NULL DEFAULT 'DRAFT';

-- AlterTable
ALTER TABLE "roles" DROP COLUMN "status",
ADD COLUMN     "status" "RoleStatus" NOT NULL DEFAULT 'ACTIVE',
ALTER COLUMN "createdBy" DROP NOT NULL;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "graduateBatch" VARCHAR(20),
ADD COLUMN     "lineId" VARCHAR(50),
ADD COLUMN     "nim" VARCHAR(50),
ADD COLUMN     "phoneNumber" VARCHAR(20),
ADD COLUMN     "studyProgramId" TEXT,
ADD COLUMN     "universityId" TEXT,
DROP COLUMN "status",
ADD COLUMN     "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE';

-- DropTable
DROP TABLE "Permission";

-- DropTable
DROP TABLE "participants";

-- DropTable
DROP TABLE "role_has_permission";

-- DropEnum
DROP TYPE "EventVisibility";

-- DropEnum
DROP TYPE "IsOnsite";

-- CreateTable
CREATE TABLE "universities" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "shortName" VARCHAR(50),
    "status" "UniversityStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "universities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "study_programs" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "shortName" VARCHAR(50),
    "status" "StudyProgramStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "study_programs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "createdAt" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" VARCHAR(100),
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_has_permissions" (
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_has_permissions_pkey" PRIMARY KEY ("roleId","permissionId")
);

-- CreateTable
CREATE TABLE "subevents" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "publicDescription" TEXT,
    "privateDescription" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "type" "SubeventType" NOT NULL,
    "locationName" VARCHAR(255),
    "locationUrl" TEXT,
    "price" INTEGER NOT NULL DEFAULT 0,
    "maxParticipants" INTEGER,
    "maxTicketsPerUser" INTEGER,
    "isRegistrationOpen" BOOLEAN NOT NULL DEFAULT false,
    "autoAcceptRegistration" BOOLEAN NOT NULL DEFAULT false,
    "checkOutToken" VARCHAR(255),
    "visibility" "SubeventVisibility" NOT NULL DEFAULT 'PUBLIC',
    "status" "SubeventStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" VARCHAR(100) NOT NULL,
    "updatedAt" TIMESTAMP(3),
    "updatedBy" VARCHAR(100),

    CONSTRAINT "subevents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registration_forms" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "status" "RegistrationFormStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" VARCHAR(100) NOT NULL,
    "updatedAt" TIMESTAMP(3),
    "updatedBy" VARCHAR(100),

    CONSTRAINT "registration_forms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "form_questions" (
    "id" TEXT NOT NULL,
    "registrationFormId" TEXT NOT NULL,
    "label" VARCHAR(255) NOT NULL,
    "fieldKey" VARCHAR(100) NOT NULL,
    "fieldType" "FormFieldType" NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "helpText" TEXT,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "status" "FormQuestionStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" VARCHAR(100) NOT NULL,
    "updatedAt" TIMESTAMP(3),
    "updatedBy" VARCHAR(100),

    CONSTRAINT "form_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "form_question_options" (
    "id" TEXT NOT NULL,
    "formQuestionId" TEXT NOT NULL,
    "label" VARCHAR(255) NOT NULL,
    "value" VARCHAR(255) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" VARCHAR(100) NOT NULL,
    "updatedAt" TIMESTAMP(3),
    "updatedBy" VARCHAR(100),

    CONSTRAINT "form_question_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registration_responses" (
    "id" TEXT NOT NULL,
    "eventHasParticipantId" TEXT NOT NULL,
    "registrationFormId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "RegistrationResponseStatus" NOT NULL DEFAULT 'DRAFT',
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "registration_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "form_answers" (
    "id" TEXT NOT NULL,
    "registrationResponseId" TEXT NOT NULL,
    "formQuestionId" TEXT NOT NULL,
    "value" TEXT,
    "selectedOptionValue" VARCHAR(255),
    "fileUrl" TEXT,
    "createdAt" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "form_answers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "permissions_name_key" ON "permissions"("name");

-- CreateIndex
CREATE UNIQUE INDEX "event_has_participants_eventId_userId_eventModeId_key" ON "event_has_participants"("eventId", "userId", "eventModeId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "universities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_studyProgramId_fkey" FOREIGN KEY ("studyProgramId") REFERENCES "study_programs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_has_roles" ADD CONSTRAINT "user_has_roles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_has_roles" ADD CONSTRAINT "user_has_roles_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_has_permissions" ADD CONSTRAINT "role_has_permissions_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_has_permissions" ADD CONSTRAINT "role_has_permissions_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subevents" ADD CONSTRAINT "subevents_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subevents" ADD CONSTRAINT "subevents_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subevents" ADD CONSTRAINT "subevents_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_has_participants" ADD CONSTRAINT "event_has_participants_eventModeId_fkey" FOREIGN KEY ("eventModeId") REFERENCES "subevents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_has_participants" ADD CONSTRAINT "event_has_participants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_has_participants" ADD CONSTRAINT "event_has_participants_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_has_participants" ADD CONSTRAINT "event_has_participants_paymentVerifiedBy_fkey" FOREIGN KEY ("paymentVerifiedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registration_forms" ADD CONSTRAINT "registration_forms_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registration_forms" ADD CONSTRAINT "registration_forms_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registration_forms" ADD CONSTRAINT "registration_forms_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_questions" ADD CONSTRAINT "form_questions_registrationFormId_fkey" FOREIGN KEY ("registrationFormId") REFERENCES "registration_forms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_questions" ADD CONSTRAINT "form_questions_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_questions" ADD CONSTRAINT "form_questions_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_question_options" ADD CONSTRAINT "form_question_options_formQuestionId_fkey" FOREIGN KEY ("formQuestionId") REFERENCES "form_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_question_options" ADD CONSTRAINT "form_question_options_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_question_options" ADD CONSTRAINT "form_question_options_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registration_responses" ADD CONSTRAINT "registration_responses_eventHasParticipantId_fkey" FOREIGN KEY ("eventHasParticipantId") REFERENCES "event_has_participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registration_responses" ADD CONSTRAINT "registration_responses_registrationFormId_fkey" FOREIGN KEY ("registrationFormId") REFERENCES "registration_forms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registration_responses" ADD CONSTRAINT "registration_responses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_answers" ADD CONSTRAINT "form_answers_registrationResponseId_fkey" FOREIGN KEY ("registrationResponseId") REFERENCES "registration_responses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_answers" ADD CONSTRAINT "form_answers_formQuestionId_fkey" FOREIGN KEY ("formQuestionId") REFERENCES "form_questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
