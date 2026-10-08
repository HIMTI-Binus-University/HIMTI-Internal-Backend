UPDATE "events"
SET "paymentProofMaxBytes" = 1572864
WHERE "paymentProofMaxBytes" <> 1572864;

ALTER TABLE "events"
  ALTER COLUMN "paymentProofMaxBytes" SET DEFAULT 1572864;

ALTER TABLE "events"
  ADD CONSTRAINT "events_paymentProofMaxBytes_fixed_check"
  CHECK ("paymentProofMaxBytes" = 1572864);
