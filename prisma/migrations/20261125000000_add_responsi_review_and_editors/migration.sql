ALTER TABLE "responsies" ADD COLUMN "approvedById" TEXT;

ALTER TABLE "responsi_versions"
ADD COLUMN "reviewerId" TEXT,
ADD COLUMN "editorIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

CREATE TABLE "responsi_editors" (
   "responsiId" TEXT NOT NULL,
   "userId" TEXT NOT NULL,
   CONSTRAINT "responsi_editors_pkey" PRIMARY KEY ("responsiId", "userId"),
   CONSTRAINT "responsi_editors_responsiId_fkey" FOREIGN KEY ("responsiId")
      REFERENCES "responsies" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
   CONSTRAINT "responsi_editors_userId_fkey" FOREIGN KEY ("userId")
      REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "responsi_editors_userId_idx" ON "responsi_editors" ("userId");
