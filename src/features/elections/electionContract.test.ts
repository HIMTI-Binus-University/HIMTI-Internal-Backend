import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { generateOpenApiDocument } from '@/docs/openapi.js';

describe('election OpenAPI contract', () => {
   it('registers public, voting, and internal election paths', () => {
      const document = generateOpenApiDocument();

      for (const path of [
         '/api/elections/current',
         '/api/elections/{electionId}/vote',
         '/api/elections/{electionId}/my-vote-status',
         '/api/internal/elections',
         '/api/internal/elections/{electionId}/debate-schedule',
         '/api/internal/elections/{electionId}/public-details',
         '/api/internal/elections/{electionId}/tally',
      ]) {
         assert.ok(document.paths?.[path], `${path} is missing`);
      }

      const voteSchema =
         document.paths?.['/api/elections/{electionId}/vote']?.post
            ?.responses?.['201'];
      assert.ok(voteSchema);
      assert.doesNotMatch(JSON.stringify(voteSchema), /candidateId/);
   });
});
