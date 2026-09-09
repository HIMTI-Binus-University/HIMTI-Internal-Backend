-- Additive guards only. Existing proof/upload records are retained.
CREATE FUNCTION "check_payment_acknowledgement_ownership"() RETURNS trigger AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM "registration_payments" p
    JOIN "registration_order_members" m ON m."registrationOrderId" = p."registrationOrderId"
    JOIN "private_uploads" u ON u.id = NEW."uploadId"
    WHERE p.id = NEW."paymentId" AND m.id = NEW."orderMemberId"
      AND m."userId" = NEW."uploadedByUserId"
      AND u."ownerUserId" = NEW."uploadedByUserId"
      AND u.purpose = 'PAYMENT_PROOF' AND u.status = 'AVAILABLE'
      AND u."sizeBytes" > 0 AND u."sizeBytes" <= 1572864
  ) THEN
    RAISE EXCEPTION 'Invalid payment acknowledgement ownership' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "payment_acknowledgement_ownership"
BEFORE INSERT OR UPDATE OF "paymentId", "orderMemberId", "uploadedByUserId", "uploadId"
ON "registration_payment_proofs"
FOR EACH ROW EXECUTE FUNCTION "check_payment_acknowledgement_ownership"();

CREATE FUNCTION "check_payment_correction_member"() RETURNS trigger AS $$
BEGIN
  IF length(btrim(NEW.reason)) = 0 OR NOT EXISTS (
    SELECT 1 FROM "registration_payments" p
    JOIN "registration_order_members" m ON m."registrationOrderId" = p."registrationOrderId"
    WHERE p.id = NEW."paymentId" AND m.id = NEW."orderMemberId"
  ) THEN
    RAISE EXCEPTION 'Invalid payment correction target' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "payment_correction_member"
BEFORE INSERT OR UPDATE OF "paymentId", "orderMemberId", reason
ON "payment_correction_targets"
FOR EACH ROW EXECUTE FUNCTION "check_payment_correction_member"();
