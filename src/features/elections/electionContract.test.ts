import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { generateOpenApiDocument } from '@/docs/openapi.js';

describe('election OpenAPI contract', () => {
   it('registers public, voting, and internal election paths', () => {
      const document = generateOpenApiDocument();

      for (const path of [
         '/api/v1/elections/current',
         '/api/v1/elections/{electionId}/vote',
         '/api/v1/elections/{electionId}/my-vote-status',
         '/api/v1/internal/elections',
         '/api/v1/internal/elections/{electionId}/debate-schedule',
         '/api/v1/internal/elections/{electionId}/public-details',
         '/api/v1/internal/elections/{electionId}/tally',
      ]) {
         assert.ok(document.paths?.[path], `${path} is missing`);
      }

      const voteSchema =
         document.paths?.['/api/v1/elections/{electionId}/vote']?.post
            ?.responses?.['201'];
      assert.ok(voteSchema);
      assert.doesNotMatch(JSON.stringify(voteSchema), /candidateId/);
   });
});
