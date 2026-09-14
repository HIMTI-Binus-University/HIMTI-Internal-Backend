ALTER TABLE "ticket_packages"
ADD COLUMN "revision" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "registration_invitations"
ADD COLUMN "registrationOrderId" TEXT,
ADD COLUMN "slotPosition" INTEGER;

ALTER TABLE "registration_invitations"
ADD CONSTRAINT "registration_invitations_registrationOrderId_fkey"
FOREIGN KEY ("registrationOrderId") REFERENCES "registration_orders"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "registration_invitations_registrationOrderId_slotPosition_key"
ON "registration_invitations"("registrationOrderId", "slotPosition");

CREATE INDEX "registration_invitations_registrationOrderId_status_idx"
ON "registration_invitations"("registrationOrderId", "status");

CREATE UNIQUE INDEX "registration_form_submissions_buyer_logical_target_key"
ON "registration_form_submissions"("registrationOrderId", "registrationFormId", "assignmentAudience")
WHERE "orderMemberId" IS NULL;

CREATE UNIQUE INDEX "registration_form_submissions_member_logical_target_key"
ON "registration_form_submissions"("registrationOrderId", "registrationFormId", "assignmentAudience", "orderMemberId")
WHERE "orderMemberId" IS NOT NULL;

ALTER TABLE "registration_invitations"
ADD CONSTRAINT "registration_invitations_slot_position_check"
CHECK (
  ("registrationOrderId" IS NULL AND "slotPosition" IS NULL)
  OR ("registrationOrderId" IS NOT NULL AND "slotPosition" IS NOT NULL AND "slotPosition" > 0)
);

ALTER TABLE "ticket_packages"
ADD CONSTRAINT "ticket_packages_seat_count_check" CHECK ("seatCount" > 0),
ADD CONSTRAINT "ticket_packages_price_minor_check" CHECK ("priceMinor" >= 0),
ADD CONSTRAINT "ticket_packages_revision_check" CHECK ("revision" > 0);

ALTER TABLE "registration_orders"
ADD CONSTRAINT "registration_orders_seat_count_check" CHECK ("seatCount" > 0);

INSERT INTO "permissions" ("id", "name", "status", "createdAt", "createdBy")
SELECT 'perm-manage-events', 'manage_events', 'ACTIVE', CURRENT_TIMESTAMP, admin_user."id"
FROM "users" admin_user
WHERE EXISTS (
  SELECT 1
  FROM "user_has_roles" user_role
  JOIN "roles" role ON role."id" = user_role."roleId"
  WHERE user_role."userId" = admin_user."id" AND role."roleName" = 'Admin'
)
ORDER BY admin_user."id"
LIMIT 1
ON CONFLICT ("name") DO NOTHING;

INSERT INTO "role_has_permissions" ("roleId", "permissionId", "assignedAt")
SELECT role."id", permission."id", CURRENT_TIMESTAMP
FROM "roles" role
JOIN "permissions" permission ON permission."name" = 'manage_events'
WHERE role."roleName" = 'Admin'
ON CONFLICT DO NOTHING;
