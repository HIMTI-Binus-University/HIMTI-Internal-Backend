UPDATE "registration_invitations"
SET "email" = lower(btrim("email"));

UPDATE "registration_invitations" invitation
SET "eventId" = registration_order."eventId",
    "subEventId" = registration_order."subEventId"
FROM "registration_orders" registration_order
WHERE invitation."registrationOrderId" = registration_order."id";

WITH duplicate_live AS (
  SELECT "id", row_number() OVER (
    PARTITION BY "registrationOrderId", lower("email")
    ORDER BY "createdAt", "id"
  ) AS duplicate_number
  FROM "registration_invitations"
  WHERE "registrationOrderId" IS NOT NULL
    AND "status" IN ('PENDING', 'ACCEPTED')
)
UPDATE "registration_invitations" invitation
SET "status" = 'REVOKED',
    "claimedBy" = NULL,
    "orderMemberId" = NULL,
    "acceptedAt" = NULL
FROM duplicate_live
WHERE invitation."id" = duplicate_live."id"
  AND duplicate_live.duplicate_number > 1;

UPDATE "registration_invitations"
SET "status" = 'REVOKED',
    "claimedBy" = NULL,
    "orderMemberId" = NULL,
    "acceptedAt" = NULL
WHERE "status" = 'ACCEPTED'
  AND ("claimedBy" IS NULL OR "orderMemberId" IS NULL OR "acceptedAt" IS NULL);

UPDATE "registration_invitations" invitation
SET "status" = 'REVOKED',
    "claimedBy" = NULL,
    "orderMemberId" = NULL,
    "acceptedAt" = NULL
WHERE invitation."status" = 'ACCEPTED'
  AND invitation."registrationOrderId" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM "registration_order_members" member
    WHERE member."id" = invitation."orderMemberId"
      AND member."registrationOrderId" = invitation."registrationOrderId"
      AND member."position" = invitation."slotPosition"
      AND member."userId" = invitation."claimedBy"
      AND member."subEventId" = invitation."subEventId"
      AND member."status" <> 'CANCELLED'
  );

UPDATE "registration_invitations"
SET "claimedBy" = NULL,
    "orderMemberId" = NULL,
    "acceptedAt" = NULL
WHERE "status" <> 'ACCEPTED';

ALTER TABLE "registration_invitations"
DROP CONSTRAINT IF EXISTS "registration_invitations_registrationOrderId_fkey";

ALTER TABLE "registration_invitations"
ADD CONSTRAINT "registration_invitations_order_scope_fkey"
FOREIGN KEY ("registrationOrderId", "eventId", "subEventId")
REFERENCES "registration_orders"("id", "eventId", "subEventId")
ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "registration_invitations_live_order_email_key"
ON "registration_invitations"("registrationOrderId", lower("email"))
WHERE "registrationOrderId" IS NOT NULL
  AND "status" IN ('PENDING', 'ACCEPTED');

CREATE UNIQUE INDEX "registration_order_members_active_buyer_key"
ON "registration_order_members"("registrationOrderId")
WHERE "isBuyer" AND "status" <> 'CANCELLED';

ALTER TABLE "registration_order_members"
ADD CONSTRAINT "registration_order_members_buyer_position_check"
CHECK (("isBuyer" AND "position" = 0) OR (NOT "isBuyer" AND "position" > 0));

ALTER TABLE "registration_invitations"
ADD CONSTRAINT "registration_invitations_acceptance_metadata_check"
CHECK (
  ("status" = 'ACCEPTED' AND "claimedBy" IS NOT NULL AND "orderMemberId" IS NOT NULL AND "acceptedAt" IS NOT NULL)
  OR
  ("status" <> 'ACCEPTED' AND "claimedBy" IS NULL AND "orderMemberId" IS NULL AND "acceptedAt" IS NULL)
);

CREATE OR REPLACE FUNCTION enforce_registration_roster_invariants()
RETURNS trigger AS $$
DECLARE
  order_row "registration_orders"%ROWTYPE;
  member_row "registration_order_members"%ROWTYPE;
  active_members integer;
BEGIN
  IF TG_TABLE_NAME = 'registration_invitations' THEN
    IF NEW."registrationOrderId" IS NULL THEN
      IF NEW."slotPosition" IS NOT NULL THEN
        RAISE EXCEPTION 'legacy invitation cannot have a slot position';
      END IF;
      RETURN NEW;
    END IF;
    SELECT * INTO order_row FROM "registration_orders"
    WHERE "id" = NEW."registrationOrderId" FOR UPDATE;
    IF NOT FOUND OR NEW."slotPosition" <= 0 OR NEW."slotPosition" >= order_row."seatCount" THEN
      RAISE EXCEPTION 'invitation slot is outside order bounds';
    END IF;
    IF NEW."orderMemberId" IS NOT NULL THEN
      SELECT * INTO member_row FROM "registration_order_members"
      WHERE "id" = NEW."orderMemberId";
      IF NOT FOUND
        OR member_row."registrationOrderId" <> NEW."registrationOrderId"
        OR member_row."position" <> NEW."slotPosition"
        OR member_row."userId" <> NEW."claimedBy"
        OR member_row."subEventId" <> NEW."subEventId"
        OR member_row."status" = 'CANCELLED'
      THEN
        RAISE EXCEPTION 'invitation member does not match order slot and claimant';
      END IF;
    END IF;
  ELSE
    SELECT * INTO order_row FROM "registration_orders"
    WHERE "id" = NEW."registrationOrderId" FOR UPDATE;
    IF NOT FOUND OR NEW."subEventId" <> order_row."subEventId"
      OR NEW."position" < 0 OR NEW."position" >= order_row."seatCount"
    THEN
      RAISE EXCEPTION 'member is outside order scope or slot bounds';
    END IF;
    SELECT count(*) INTO active_members
    FROM "registration_order_members"
    WHERE "registrationOrderId" = NEW."registrationOrderId"
      AND "status" <> 'CANCELLED'
      AND "id" <> NEW."id";
    IF NEW."status" <> 'CANCELLED' AND active_members + 1 > order_row."seatCount" THEN
      RAISE EXCEPTION 'active member count exceeds order seat count';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER registration_invitations_roster_invariants
BEFORE INSERT OR UPDATE ON "registration_invitations"
FOR EACH ROW EXECUTE FUNCTION enforce_registration_roster_invariants();

CREATE TRIGGER registration_order_members_roster_invariants
BEFORE INSERT OR UPDATE ON "registration_order_members"
FOR EACH ROW EXECUTE FUNCTION enforce_registration_roster_invariants();
