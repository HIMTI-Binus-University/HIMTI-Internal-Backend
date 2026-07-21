import '@/docs/zodOpenApi.js';
import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import {
   errorResponseSchema,
   protectedEndpoint,
} from '@/docs/commonSchemas.js';

const resourceResponseSchema = z.object({
   msg: z.literal('success'),
   data: z.object({
      period: z.object({ id: z.string(), label: z.string() }),
      groups: z.array(
         z.object({ id: z.string(), title: z.string(), url: z.string().url() }),
      ),
      contacts: z.array(
         z.object({
            id: z.string(),
            areas: z.array(z.string()),
            name: z.string(),
            phoneNumber: z.string(),
            contactUrl: z.string().url(),
         }),
      ),
   }),
});

export const registerMembershipDocs = (registry: OpenAPIRegistry) => {
   registry.registerPath({
      method: 'get',
      path: '/api/membership/resources',
      tags: ['Membership'],
      summary: 'Get membership groups and contacts for the current member',
      security: [protectedEndpoint],
      responses: {
         200: {
            description: 'Resources for the active membership period.',
            content: { 'application/json': { schema: resourceResponseSchema } },
         },
         403: {
            description: 'Registration is incomplete.',
            content: { 'application/json': { schema: errorResponseSchema } },
         },
         404: {
            description: 'No active membership period exists.',
            content: { 'application/json': { schema: errorResponseSchema } },
         },
      },
   });
};
