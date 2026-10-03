DELETE FROM "role_has_permissions"
WHERE "permissionId" IN (
    SELECT "id" FROM "permissions" WHERE "name" = 'view_election_results'
);

DELETE FROM "permissions" WHERE "name" = 'view_election_results';
