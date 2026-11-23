CREATE TYPE "EducationVideoStatus" AS ENUM ('DRAFT', 'PUBLISHED');
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

CREATE INDEX "education_videos_sessionId_idx" ON "education_videos"("sessionId");
CREATE INDEX "education_videos_status_updatedAt_idx" ON "education_videos"("status", "updatedAt");
