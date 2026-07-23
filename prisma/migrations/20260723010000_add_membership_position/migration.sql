CREATE TYPE "MembershipPosition" AS ENUM ('OFFICER', 'STAFF', 'MEMBER');

ALTER TABLE "user_membership_periods"
ADD COLUMN "position" "MembershipPosition";

UPDATE "user_membership_periods"
SET "position" = 'MEMBER'
WHERE "position" IS NULL;

ALTER TABLE "user_membership_periods"
ALTER COLUMN "position" SET NOT NULL;

ALTER TABLE "user_membership_periods"
ALTER COLUMN "position" SET DEFAULT 'MEMBER';
