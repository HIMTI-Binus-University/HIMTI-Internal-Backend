-- Membership attestations only: no permissions and no automatic assignments.
-- Administrators must validate SoCS membership before assigning these roles.
INSERT INTO "users" ("id", "name", "email", "emailVerified", "status")
VALUES ('system-socs-electorate', 'System', 'system@himti.internal', true, 'ACTIVE')
ON CONFLICT ("email") DO NOTHING;

INSERT INTO "roles" ("id", "roleName", "status", "createdBy")
SELECT seed.id, seed.name, 'ACTIVE'::"RoleStatus", creator.id
FROM (VALUES ('role-socs-student', 'SoCS Student'), ('role-socs-lecturer', 'SoCS Lecturer')) AS seed(id, name)
CROSS JOIN "users" AS creator
WHERE creator.email = 'system@himti.internal'
ON CONFLICT ("roleName") DO NOTHING;
