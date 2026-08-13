CREATE UNIQUE INDEX "link_workspace_members_one_owner_idx"
ON "link_workspace_members"("workspaceId")
WHERE "role" = 'OWNER';

CREATE UNIQUE INDEX "link_workspaces_name_ci_key"
ON "link_workspaces"(LOWER("name"));
