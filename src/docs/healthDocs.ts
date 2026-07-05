import '@/docs/zodOpenApi.js';
import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

const tag = 'Health';

const healthResponseSchema = z.object({
   status: z.literal('ok'),
   uptime: z.number(),
   timestamp: z.string().datetime(),
});

export const registerHealthDocs = (registry: OpenAPIRegistry) => {
   const HealthResponse = registry.register(
      'HealthResponse',
      healthResponseSchema,
   );

   registry.registerPath({
      method: 'get',
      path: '/api/health',
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
};
