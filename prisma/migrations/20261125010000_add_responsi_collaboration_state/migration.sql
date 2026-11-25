ALTER TABLE "responsies"
ADD COLUMN "collaborationState" BYTEA,
ADD COLUMN "collaborationRevision" INTEGER NOT NULL DEFAULT 0;
