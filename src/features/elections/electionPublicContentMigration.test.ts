import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

test('adds optional election public content without rewriting existing records', async () => {
   const migration = await readFile(
      new URL(
         '../../../prisma/migrations/20260825010000_add_election_public_content/migration.sql',
         import.meta.url,
      ),
      'utf8',
   );

   assert.match(migration, /"debateAt" TIMESTAMP\(0\)/);
   assert.match(migration, /"videoUrl" TEXT/);
   assert.match(migration, /"workPrograms" TEXT\[\] NOT NULL DEFAULT/);
   assert.match(migration, /"experiences" TEXT\[\] NOT NULL DEFAULT/);
});
