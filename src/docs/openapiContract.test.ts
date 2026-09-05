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

   it('exposes canonical event foundation routes', () => {
      const document = generateOpenApiDocument();

      assert.ok(document.paths['/api/events']);
      assert.ok(document.paths['/api/event-groups']);
      assert.ok(document.paths['/api/internal/events']);
      assert.ok(document.paths['/api/internal/event-groups']);
      assert.ok(document.paths['/api/health']);
      assert.equal(
         document.paths['/api/health']?.get?.operationId,
         'getApiHealth',
      );
   });

   it('documents exact Phase 2 workspace success responses', () => {
      const document = generateOpenApiDocument();
      const paths = document.paths;
      const response = (
         path: string,
         method: 'get' | 'post' | 'put' | 'patch',
         status: '200' | '201',
      ) => paths[path]?.[method]?.responses?.[status];
      const responseRef = (
         path: string,
         method: 'get' | 'post' | 'put' | 'patch',
         status: '200' | '201',
      ) => JSON.stringify(response(path, method, status));

      const packagePath = '/api/internal/events/{eventId}/packages';
      const packageItemPath = `${packagePath}/{packageId}`;
      const formPath = '/api/internal/events/{eventId}/registration-form';
      const settingsPath =
         '/api/internal/events/{eventId}/registration-settings';
      assert.match(
         responseRef(packagePath, 'get', '200'),
         /EventPackageListResponse/,
      );
      assert.match(
         responseRef(packagePath, 'post', '201'),
         /EventPackageItemResponse/,
      );
      for (const [path, method] of [
         [packageItemPath, 'get'],
         [packageItemPath, 'patch'],
         [`${packageItemPath}/activate`, 'post'],
         [`${packageItemPath}/deactivate`, 'post'],
      ] as const)
         assert.match(
            responseRef(path, method, '200'),
            /EventPackageItemResponse/,
         );
      for (const [path, method, status] of [
         [formPath, 'get', '200'],
         [formPath, 'put', '200'],
         [`${formPath}/publish`, 'post', '200'],
         [`${formPath}/close`, 'post', '200'],
         [`${formPath}/duplicate`, 'post', '201'],
      ] as const)
         assert.match(
            responseRef(path, method, status),
            /EventRegistrationFormResponse/,
         );
      assert.match(
         responseRef(`${formPath}/validate`, 'post', '200'),
         /EventRegistrationFormValidateResponse/,
      );
      assert.match(
         responseRef(`${formPath}/preview`, 'post', '200'),
         /EventRegistrationFormPreviewResponse/,
      );
      for (const method of ['get', 'put'] as const)
         assert.match(
            responseRef(settingsPath, method, '200'),
            /EventRegistrationSettingsResponse/,
         );
      for (const value of [
         response(packagePath, 'get', '200'),
         response(formPath, 'get', '200'),
         response(settingsPath, 'get', '200'),
      ])
         assert.ok(
            value && typeof value === 'object' && 'content' in value,
            'Successful Phase 2 responses must declare application/json content',
         );

      const packageSchema = document.components?.schemas?.EventPackage;
      assert.match(JSON.stringify(packageSchema), /Prisma BigInt/);
      assert.equal(
         (packageSchema as { properties?: { priceMinor?: { type?: string } } })
            .properties?.priceMinor?.type,
         'string',
      );
   });

   it('keeps Phase 2 operation IDs unversioned', () => {
      const document = generateOpenApiDocument();
      const operationIds = Object.values(document.paths).flatMap((path) =>
         Object.values(path ?? {}).flatMap((operation) =>
            operation &&
            typeof operation === 'object' &&
            'operationId' in operation
               ? [String(operation.operationId)]
               : [],
         ),
      );

      assert.ok(operationIds.includes('listEventPackages'));
      assert.ok(operationIds.includes('previewEventRegistrationForm'));
      assert.ok(operationIds.includes('updateEventRegistrationSettings'));
      assert.equal(
         operationIds.some((id) => /V[12]$/.test(id)),
         false,
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
