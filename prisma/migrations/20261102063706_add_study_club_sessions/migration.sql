-- CreateTable
CREATE TABLE "study_club_sessions" (
    "id" TEXT NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "type" VARCHAR(20) NOT NULL,
    "courseId" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "startsAt" TIMESTAMPTZ(3) NOT NULL,
    "endsAt" TIMESTAMPTZ(3) NOT NULL,
    "location" VARCHAR(255) NOT NULL DEFAULT '',
    "meetingUrl" VARCHAR(2048) NOT NULL DEFAULT '',
    "registrationUrl" VARCHAR(2048) NOT NULL DEFAULT '',
    "capacity" INTEGER,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" VARCHAR(100) NOT NULL,
    "updatedBy" VARCHAR(100) NOT NULL,
    "createdAt" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "study_club_sessions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "study_club_sessions_dates_check" CHECK ("endsAt" > "startsAt"),
    CONSTRAINT "study_club_sessions_capacity_check" CHECK ("capacity" IS NULL OR "capacity" > 0),
    CONSTRAINT "study_club_sessions_type_check" CHECK ("type" IN ('Study Club', 'Responsi')),
    CONSTRAINT "study_club_sessions_location_check" CHECK (length(trim("location")) > 0 OR length(trim("meetingUrl")) > 0)
);

-- CreateIndex
CREATE INDEX "study_club_sessions_courseId_startsAt_idx" ON "study_club_sessions"("courseId", "startsAt");

-- CreateIndex
CREATE INDEX "study_club_sessions_endsAt_startsAt_idx" ON "study_club_sessions"("endsAt", "startsAt");

-- AddForeignKey
ALTER TABLE "study_club_sessions" ADD CONSTRAINT "study_club_sessions_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
