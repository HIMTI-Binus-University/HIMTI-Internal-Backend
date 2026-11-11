-- DropForeignKey
ALTER TABLE "attendance_check_ins" DROP CONSTRAINT "attendance_check_ins_ticket_event_scope_fkey";

-- DropForeignKey
ALTER TABLE "registration_tickets" DROP CONSTRAINT "registration_tickets_member_event_scope_fkey";

-- CreateTable
CREATE TABLE "HimtiKitAppearance" (
    "id" TEXT NOT NULL,
    "accentColor" TEXT NOT NULL DEFAULT '#0284c7',
    "backgroundImageUrl" TEXT NOT NULL,
    "overlayEnabled" BOOLEAN NOT NULL DEFAULT true,
    "overlayDarkness" INTEGER NOT NULL DEFAULT 65,
    "blurEnabled" BOOLEAN NOT NULL DEFAULT true,
    "blurIntensity" INTEGER NOT NULL DEFAULT 4,
    "createdAt" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "HimtiKitAppearance_pkey" PRIMARY KEY ("id")
);
