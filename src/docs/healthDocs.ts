import '@/docs/zodOpenApi.js';
import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

const tag = 'Health';

const healthResponseSchema = z.object({
   status: z.literal('ok'),
   uptime: z.number(),
   timestamp: z.string().datetime(),
});

const v1HealthResponseSchema = z.object({
   status: z.literal('ok'),
   version: z.literal('v1'),
   timestamp: z.string().datetime(),
});

export const registerHealthDocs = (registry: OpenAPIRegistry) => {
   const HealthResponse = registry.register(
      'HealthResponse',
      healthResponseSchema,
   );
   const V1HealthResponse = registry.register(
      'V1HealthResponse',
      v1HealthResponseSchema,
   );

   registry.registerPath({
      method: 'get',
      path: '/api/health',
      operationId: 'getLegacyApiHealth',
      tags: [tag],
      summary: 'Check API health',
      responses: {
         200: {
            description: 'The API process is running.',
            content: {
               'application/json': {
                  schema: HealthResponse,
               },
            },
         },
      },
   });

   registry.registerPath({
      method: 'get',
      path: '/api/v1/health',
      operationId: 'getApiV1Health',
      tags: [tag],
      summary: 'Check the versioned API boundary',
      responses: {
         200: {
            description: 'The API V1 process is running.',
            content: {
               'application/json': {
                  schema: V1HealthResponse,
               },
            },
         },
      },
   });
};
