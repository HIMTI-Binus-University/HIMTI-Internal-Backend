ALTER TABLE "elections" ADD COLUMN "originalEndsAt" TIMESTAMP(0);
UPDATE "elections" SET "originalEndsAt" = "endsAt";
ALTER TABLE "elections" ALTER COLUMN "originalEndsAt" SET NOT NULL;
ALTER TABLE "elections" ADD CONSTRAINT "elections_original_voting_end_check" CHECK ("endsAt" >= "originalEndsAt");

CREATE FUNCTION election_preserve_original_end() RETURNS trigger AS $$
BEGIN
  IF NEW."originalEndsAt" IS DISTINCT FROM OLD."originalEndsAt" THEN
    RAISE EXCEPTION 'originalEndsAt is immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER elections_original_end_immutable
BEFORE UPDATE ON "elections"
FOR EACH ROW EXECUTE FUNCTION election_preserve_original_end();
