UPDATE "events"
SET "paymentProofTypes" = ARRAY['image/jpeg', 'image/png', 'application/pdf']::TEXT[];

ALTER TABLE "events"
ALTER COLUMN "paymentProofTypes"
SET DEFAULT ARRAY['image/jpeg', 'image/png', 'application/pdf']::TEXT[];

ALTER TABLE "events"
ADD CONSTRAINT "events_payment_proof_types_fixed"
CHECK ("paymentProofTypes" = ARRAY['image/jpeg', 'image/png', 'application/pdf']::TEXT[]);
