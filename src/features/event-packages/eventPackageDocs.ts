import '@/docs/zodOpenApi.js';
import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import {
   createEventPackageSchema,
   eventPackageResponseSchema,
   updateEventPackageSchema,
} from './eventPackageSchema.js';
import { errorResponseSchema } from '@/docs/commonSchemas.js';

export const registerEventPackageDocs = (registry: OpenAPIRegistry) => {
   const tag = 'Event packages V1';
   const security = [{ sessionCookie: [] }];
   const response = z.object({
      msg: z.literal('success'),
      data: eventPackageResponseSchema,
   });
   const common = {
      401: { description: 'Authentication required.' },
      403: { description: 'manage_events and event object scope required.' },
      404: {
         description: 'Resource not found.',
         content: { 'application/json': { schema: errorResponseSchema } },
      },
      409: {
         description: 'Code, revision, or immutability conflict.',
         content: { 'application/json': { schema: errorResponseSchema } },
      },
   };
   registry.registerPath({
      method: 'get',
      path: '/api/v1/internal/sub-events/{subEventId}/packages',
      operationId: 'listEventPackagesV1',
      tags: [tag],
      security,
      request: { params: z.object({ subEventId: z.string() }) },
      responses: {
         200: {
            description: 'Packages with editability metadata.',
            content: {
               'application/json': {
                  schema: z.object({
                     msg: z.literal('success'),
                     data: z.array(eventPackageResponseSchema),
                  }),
               },
            },
         },
         ...common,
      },
   });
   registry.registerPath({
      method: 'post',
      path: '/api/v1/internal/sub-events/{subEventId}/packages',
      operationId: 'createEventPackageV1',
      tags: [tag],
      security,
      request: {
         params: z.object({ subEventId: z.string() }),
         body: {
            required: true,
            content: {
               'application/json': { schema: createEventPackageSchema },
            },
         },
      },
      responses: {
         201: {
            description: 'Package created.',
            content: { 'application/json': { schema: response } },
         },
         ...common,
      },
   });
   registry.registerPath({
      method: 'put',
      path: '/api/v1/internal/event-packages/{packageId}',
      operationId: 'updateEventPackageV1',
      tags: [tag],
      security,
      request: {
         params: z.object({ packageId: z.string() }),
         body: {
            required: true,
            content: {
               'application/json': { schema: updateEventPackageSchema },
            },
         },
      },
      responses: {
         200: {
            description: 'Package updated using revision CAS.',
            content: { 'application/json': { schema: response } },
         },
         ...common,
      },
   });
};
