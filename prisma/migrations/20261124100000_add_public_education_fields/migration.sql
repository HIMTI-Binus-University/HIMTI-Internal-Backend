ALTER TABLE "courses" ADD COLUMN "semester" INTEGER;
ALTER TABLE "study_club_sessions" ADD COLUMN "isPublic" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "courses" ADD CONSTRAINT "courses_semester_positive" CHECK ("semester" > 0);
CREATE UNIQUE INDEX "courses_public_code_key"
ON "courses" (lower(btrim("code")))
WHERE "status" = 'ACTIVE' AND "semester" IS NOT NULL AND "code" IS NOT NULL;
