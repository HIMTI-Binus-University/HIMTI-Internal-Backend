CREATE TYPE "EducationVideoStatus" AS ENUM ('DRAFT', 'PUBLISHED');
CREATE TYPE "EducationSessionType" AS ENUM ('STUDY_CLUB', 'RESPONSI');

-- Temporary minimal model for session selection until Education session management is integrated.
CREATE TABLE "education_sessions" (
    "id" TEXT NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "type" "EducationSessionType" NOT NULL,
    "courseId" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3),

    CONSTRAINT "education_sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "education_videos" (
    "id" TEXT NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "sessionId" TEXT NOT NULL,
    "youtubeUrl" TEXT NOT NULL,
    "youtubeVideoId" VARCHAR(11) NOT NULL,
    "status" "EducationVideoStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "education_videos_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "education_sessions_courseId_idx" ON "education_sessions"("courseId");
CREATE INDEX "education_videos_sessionId_idx" ON "education_videos"("sessionId");
CREATE INDEX "education_videos_status_updatedAt_idx" ON "education_videos"("status", "updatedAt");

ALTER TABLE "education_sessions" ADD CONSTRAINT "education_sessions_courseId_fkey"
    FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "education_videos" ADD CONSTRAINT "education_videos_sessionId_fkey"
    FOREIGN KEY ("sessionId") REFERENCES "education_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
