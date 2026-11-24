-- AddForeignKey
ALTER TABLE "education_videos" ADD CONSTRAINT "education_videos_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "study_club_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
