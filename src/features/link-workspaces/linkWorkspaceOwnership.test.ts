import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { describe, it } from 'node:test';

const migrationPath = new URL(
   '../../../prisma/migrations/20260811000000_add_link_workspaces/migration.sql',
   import.meta.url,
);

describe('link workspace ownership database rules', () => {
   it('enforces at most one owner with a partial unique index', async () => {
      const migration = await readFile(migrationPath, 'utf8');

      assert.match(
         migration,
         /CREATE UNIQUE INDEX "link_workspace_members_one_owner_idx"[\s\S]*WHERE "role" = 'OWNER';/,
      );
   });

   it('keeps the deferred at-least-one-owner constraint triggers', async () => {
      const migration = await readFile(migrationPath, 'utf8');

      assert.match(migration, /DEFERRABLE INITIALLY DEFERRED/);
      assert.match(migration, /"link_workspaces_require_owner"/);
      assert.match(migration, /"link_workspace_members_preserve_owner"/);
   });
});
