import '@/docs/zodOpenApi.js';
import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
export const registerEventGroupDocs = (registry: OpenAPIRegistry) => {
   const responses = {
      200: { description: 'Success' },
      403: { description: 'Permission and object scope required' },
      404: { description: 'Event group not found' },
   };
   registry.registerPath({
      method: 'get',
      path: '/api/event-groups',
      operationId: 'listEventGroups',
      tags: ['Event Groups'],
      responses,
   });
   registry.registerPath({
      method: 'get',
      path: '/api/event-groups/{eventGroupId}',
      operationId: 'getEventGroup',
      tags: ['Event Groups'],
      request: { params: z.object({ eventGroupId: z.string() }) },
      responses,
   });
   registry.registerPath({
      method: 'get',
      path: '/api/internal/event-groups',
      operationId: 'listInternalEventGroups',
      tags: ['Internal Event Groups'],
      security: [{ sessionCookie: [] }],
      responses,
   });
   registry.registerPath({
      method: 'post',
      path: '/api/internal/event-groups',
      operationId: 'createEventGroup',
      tags: ['Internal Event Groups'],
      security: [{ sessionCookie: [] }],
      responses: { ...responses, 201: { description: 'Created' } },
   });
   for (const method of ['get', 'patch'] as const)
      registry.registerPath({
         method,
         path: '/api/internal/event-groups/{eventGroupId}',
         operationId:
            method === 'get' ? 'getInternalEventGroup' : 'updateEventGroup',
         tags: ['Internal Event Groups'],
         security: [{ sessionCookie: [] }],
         request: { params: z.object({ eventGroupId: z.string() }) },
         responses,
      });
   for (const action of ['publish', 'archive'] as const)
      registry.registerPath({
         method: 'post',
         path: `/api/internal/event-groups/{eventGroupId}/${action}`,
         operationId: `${action}EventGroup`,
         tags: ['Internal Event Groups'],
         security: [{ sessionCookie: [] }],
         request: { params: z.object({ eventGroupId: z.string() }) },
         responses,
      });
   registry.registerPath({
      method: 'get',
      path: '/api/internal/event-groups/{eventGroupId}/organizers',
      operationId: 'listEventGroupOrganizers',
      tags: ['Internal Event Groups'],
      security: [{ sessionCookie: [] }],
      request: { params: z.object({ eventGroupId: z.string() }) },
      responses,
   });
   registry.registerPath({
      method: 'post',
      path: '/api/internal/event-groups/{eventGroupId}/organizers',
      operationId: 'addEventGroupOrganizer',
      tags: ['Internal Event Groups'],
      security: [{ sessionCookie: [] }],
      request: { params: z.object({ eventGroupId: z.string() }) },
      responses: { ...responses, 201: { description: 'Created' } },
   });
   for (const method of ['patch', 'delete'] as const)
      registry.registerPath({
         method,
         path: '/api/internal/event-groups/{eventGroupId}/organizers/{userId}',
         operationId:
            method === 'patch'
               ? 'updateEventGroupOrganizer'
               : 'removeEventGroupOrganizer',
         tags: ['Internal Event Groups'],
         security: [{ sessionCookie: [] }],
         request: {
            params: z.object({ eventGroupId: z.string(), userId: z.string() }),
         },
         responses,
      });
};
