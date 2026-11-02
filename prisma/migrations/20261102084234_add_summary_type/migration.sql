-- AlterTable
ALTER TABLE "responsies" ADD COLUMN     "summaryType" VARCHAR(20) NOT NULL DEFAULT 'Responsi';

ALTER TABLE "responsies" ADD CONSTRAINT "responsies_summaryType_check"
CHECK ("summaryType" IN ('Responsi', 'Study Club'));
