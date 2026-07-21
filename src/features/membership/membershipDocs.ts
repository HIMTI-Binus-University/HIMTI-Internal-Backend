import '@/docs/zodOpenApi.js';
import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import {
   errorResponseSchema,
   protectedEndpoint,
} from '@/docs/commonSchemas.js';
import { MembershipResourcesResponseSchema } from './membershipSchema.js';

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
            content: {
               'application/json': {
                  schema: MembershipResourcesResponseSchema,
               },
            },
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
