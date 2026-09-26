ALTER TABLE "subevents"
ADD COLUMN "posterUrl" TEXT,
ADD COLUMN "destinationUrl" TEXT,
ADD COLUMN "position" INTEGER NOT NULL DEFAULT 0;

WITH ranked_subevents AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "eventId"
      ORDER BY "date" ASC, "id" ASC
    ) - 1 AS "position"
  FROM "subevents"
)
UPDATE "subevents" AS subevent
SET "position" = ranked_subevents."position"
FROM ranked_subevents
WHERE subevent."id" = ranked_subevents."id";

CREATE INDEX "subevents_eventId_position_idx"
ON "subevents"("eventId", "position");
