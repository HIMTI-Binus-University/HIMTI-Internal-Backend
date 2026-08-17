-- Phase 6 internal registration review is additive and uses order-level CAS.
ALTER TABLE "registration_orders"
ADD COLUMN "revision" INTEGER NOT NULL DEFAULT 1;

CREATE INDEX "registration_orders_subEventId_status_submittedAt_id_idx"
ON "registration_orders"("subEventId", "status", "submittedAt", "id");

-- Permission rows are provisioned without broad role grants. The established
-- Admin role receives them; other roles must be granted deliberately.
WITH permission_seed(name) AS (
   VALUES ('review_event_registrations'), ('view_event_answers')
), admin_creator AS (
   SELECT u."id"
   FROM "users" u
   JOIN "user_has_roles" ur ON ur."userId" = u."id"
   JOIN "roles" r ON r."id" = ur."roleId"
   WHERE r."roleName" = 'Admin'
   ORDER BY u."createdAt" ASC
   LIMIT 1
)
INSERT INTO "permissions" ("id", "name", "status", "createdAt", "createdBy")
SELECT 'phase6-' || md5(permission_seed.name), permission_seed.name, 'ACTIVE', CURRENT_TIMESTAMP, admin_creator."id"
FROM permission_seed CROSS JOIN admin_creator
ON CONFLICT ("name") DO NOTHING;

INSERT INTO "role_has_permissions" ("roleId", "permissionId", "assignedAt")
SELECT r."id", p."id", CURRENT_TIMESTAMP
FROM "roles" r
JOIN "permissions" p ON p."name" IN ('review_event_registrations', 'view_event_answers')
WHERE r."roleName" = 'Admin'
ON CONFLICT ("roleId", "permissionId") DO NOTHING;
