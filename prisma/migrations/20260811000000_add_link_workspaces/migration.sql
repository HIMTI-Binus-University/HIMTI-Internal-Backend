-- Additive Link Workspace migration. Existing rows in "urls" are not updated.
CREATE TYPE "LinkWorkspaceRole" AS ENUM ('OWNER', 'EDITOR', 'VIEWER');
CREATE TYPE "LinkWorkspaceStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

CREATE TABLE "link_workspaces" (
  "id" TEXT NOT NULL,
  "name" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "status" "LinkWorkspaceStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3),
  "createdBy" VARCHAR(100) NOT NULL,
  "updatedBy" VARCHAR(100),
  CONSTRAINT "link_workspaces_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "link_workspace_members" (
  "workspaceId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "role" "LinkWorkspaceRole" NOT NULL,
  "createdAt" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3),
  CONSTRAINT "link_workspace_members_pkey" PRIMARY KEY ("workspaceId", "userId")
);

CREATE TABLE "link_workspace_links" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "urlId" TEXT NOT NULL,
  "status" "Status" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3),
  "createdBy" VARCHAR(100) NOT NULL,
  "updatedBy" VARCHAR(100),
  CONSTRAINT "link_workspace_links_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "link_workspaces_status_createdAt_idx" ON "link_workspaces"("status", "createdAt");
CREATE INDEX "link_workspace_members_userId_role_idx" ON "link_workspace_members"("userId", "role");
CREATE UNIQUE INDEX "link_workspace_links_urlId_key" ON "link_workspace_links"("urlId");
CREATE INDEX "link_workspace_links_workspaceId_status_createdAt_idx" ON "link_workspace_links"("workspaceId", "status", "createdAt");

ALTER TABLE "link_workspaces" ADD CONSTRAINT "link_workspaces_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "link_workspaces" ADD CONSTRAINT "link_workspaces_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "link_workspace_members" ADD CONSTRAINT "link_workspace_members_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "link_workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "link_workspace_members" ADD CONSTRAINT "link_workspace_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "link_workspace_links" ADD CONSTRAINT "link_workspace_links_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "link_workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "link_workspace_links" ADD CONSTRAINT "link_workspace_links_urlId_fkey" FOREIGN KEY ("urlId") REFERENCES "urls"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "link_workspace_links" ADD CONSTRAINT "link_workspace_links_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "link_workspace_links" ADD CONSTRAINT "link_workspace_links_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Deferred checks permit creating a workspace and its initial owner in one
-- transaction while preventing ownerless workspaces at commit time.
CREATE FUNCTION "ensure_link_workspace_owner"() RETURNS TRIGGER AS $$
DECLARE
  target_workspace_id TEXT;
BEGIN
  IF TG_TABLE_NAME = 'link_workspaces' THEN
    target_workspace_id := NEW."id";
  ELSE
    target_workspace_id := COALESCE(NEW."workspaceId", OLD."workspaceId");
  END IF;

  IF EXISTS (SELECT 1 FROM "link_workspaces" WHERE "id" = target_workspace_id)
     AND NOT EXISTS (
       SELECT 1 FROM "link_workspace_members"
       WHERE "workspaceId" = target_workspace_id AND "role" = 'OWNER'
     ) THEN
    RAISE EXCEPTION 'Link workspace % must have at least one owner', target_workspace_id
      USING ERRCODE = '23514';
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE CONSTRAINT TRIGGER "link_workspaces_require_owner"
AFTER INSERT ON "link_workspaces"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION "ensure_link_workspace_owner"();

CREATE CONSTRAINT TRIGGER "link_workspace_members_preserve_owner"
AFTER INSERT OR UPDATE OR DELETE ON "link_workspace_members"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION "ensure_link_workspace_owner"();
