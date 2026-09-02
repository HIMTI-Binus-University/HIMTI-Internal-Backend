import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { describe, it } from 'node:test';

const migrationPath = new URL(
   '../../../prisma/migrations/20260825000000_add_chairman_election_v1/migration.sql',
   import.meta.url,
);

describe('election migration invariants', () => {
   it('separates voter participation from anonymous ballots', async () => {
      const sql = await readFile(migrationPath, 'utf8');
      const ballotTable = sql.match(
         /CREATE TABLE "election_ballots" \(([\s\S]*?)\n\);/,
      )?.[1];

      assert.ok(ballotTable);
      assert.doesNotMatch(ballotTable, /"userId"|"receiptCode"|"votedAt"/);
      assert.match(sql, /PRIMARY KEY \("electionId", "userId"\)/);
      assert.match(sql, /elections_one_open_idx/);
      assert.match(sql, /FOREIGN KEY \("candidateId", "electionId"\)/);
      assert.match(sql, /'ACTIVE'::"Status"/);
   });
});
