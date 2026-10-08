ALTER TABLE "elections" ADD COLUMN "debateAt" TIMESTAMP(0);

ALTER TABLE "election_candidates"
ADD COLUMN "slogan" TEXT,
ADD COLUMN "videoUrl" TEXT,
ADD COLUMN "workPrograms" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "experiences" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
