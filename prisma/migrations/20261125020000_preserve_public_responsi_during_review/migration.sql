CREATE TABLE "responsi_publications" (
   "id" TEXT NOT NULL,
   "courseId" TEXT NOT NULL,
   "title" VARCHAR(255) NOT NULL,
   "academicPeriod" VARCHAR(50) NOT NULL,
   "examType" VARCHAR(50) NOT NULL,
   "content" TEXT NOT NULL,
   CONSTRAINT "responsi_publications_pkey" PRIMARY KEY ("id"),
   CONSTRAINT "responsi_publications_id_fkey" FOREIGN KEY ("id")
      REFERENCES "responsies" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
   CONSTRAINT "responsi_publications_courseId_fkey" FOREIGN KEY ("courseId")
      REFERENCES "courses" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "responsi_publications_courseId_idx" ON "responsi_publications" ("courseId");

INSERT INTO "responsi_publications" ("id", "courseId", "title", "academicPeriod", "examType", "content")
SELECT "id", "courseId", "title", "academicPeriod", "examType", "content"
FROM "responsies"
WHERE "status" = 'PUBLISHED';
