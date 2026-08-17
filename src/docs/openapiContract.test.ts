import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
   generateOpenApiDocument,
   serializeOpenApiDocument,
} from './openapi.js';

const artifactPath = fileURLToPath(
   new URL('../../openapi.json', import.meta.url),
);

describe('OpenAPI contract', () => {
   it('serializes deterministically and matches the committed artifact', () => {
      assert.equal(serializeOpenApiDocument(), serializeOpenApiDocument());
      assert.equal(
         readFileSync(artifactPath, 'utf8'),
         serializeOpenApiDocument(),
      );
   });

   it('keeps legacy routes and exposes an explicit V1 boundary', () => {
      const document = generateOpenApiDocument();

      assert.ok(document.paths['/api/event/published']);
      assert.ok(document.paths['/api/v1/health']);
      assert.equal(
         document.paths['/api/v1/health']?.get?.operationId,
         'getApiV1Health',
      );
   });

   it('does not vary with the process port', () => {
      const originalPort = process.env.PORT;
      process.env.PORT = '9999';
      const serialized = serializeOpenApiDocument();
      process.env.PORT = originalPort;

      assert.doesNotMatch(serialized, /localhost:9999/);
      assert.match(serialized, /localhost:8000/);
   });
});
