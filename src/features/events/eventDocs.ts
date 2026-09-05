import '@/docs/zodOpenApi.js';
import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import { RegistrationSettingsSchema } from './eventSchema.js';

const registrationSettingsSchema = z.object({
   id: z.string(),
   isRegistrationOpen: z.boolean(),
   registrationOpensAt: z.string().datetime().nullable(),
   registrationClosesAt: z.string().datetime().nullable(),
   cancellationClosesAt: z.string().datetime().nullable(),
   capacity: z.number().int().positive().nullable(),
   paymentCurrency: z.string().length(3),
   paymentBankName: z.string().nullable(),
   paymentAccountNumber: z.string().nullable(),
   paymentAccountHolder: z.string().nullable(),
   paymentInstructions: z.string().nullable(),
   paymentProofTypes: z.array(z.string()),
   paymentProofMaxBytes: z.number().int().positive(),
   attendanceEnabled: z.boolean(),
   attendanceCheckoutEnabled: z.boolean(),
});

export const registerEventDocs = (registry: OpenAPIRegistry) => {
   const EventRegistrationSettings = registry.register(
      'EventRegistrationSettings',
      registrationSettingsSchema,
   );
   const EventRegistrationSettingsResponse = registry.register(
      'EventRegistrationSettingsResponse',
      z.object({ data: EventRegistrationSettings }),
   );
   const response = {
      200: { description: 'Success' },
      401: { description: 'Authentication required' },
      403: { description: 'Permission and event scope required' },
      404: { description: 'Event not found' },
   };
   registry.registerPath({
      method: 'get',
      path: '/api/events',
      tags: ['Events'],
      operationId: 'listEvents',
      responses: response,
   });
   registry.registerPath({
      method: 'get',
      path: '/api/events/{eventId}',
      tags: ['Events'],
      operationId: 'getEvent',
      request: { params: z.object({ eventId: z.string() }) },
      responses: response,
   });
   registry.registerPath({
      method: 'get',
      path: '/api/internal/events',
      tags: ['Internal Events'],
      operationId: 'listInternalEvents',
      security: [{ sessionCookie: [] }],
      responses: response,
   });
   registry.registerPath({
      method: 'post',
      path: '/api/internal/events',
      tags: ['Internal Events'],
      operationId: 'createEvent',
      security: [{ sessionCookie: [] }],
      responses: { ...response, 201: { description: 'Created' } },
   });
   for (const method of ['get', 'patch'] as const)
      registry.registerPath({
         method,
         path: '/api/internal/events/{eventId}',
         tags: ['Internal Events'],
         operationId: method === 'get' ? 'getInternalEvent' : 'updateEvent',
         security: [{ sessionCookie: [] }],
         request: { params: z.object({ eventId: z.string() }) },
         responses: response,
      });
   registry.registerPath({
      method: 'get',
      path: '/api/internal/events/{eventId}/organizers',
      tags: ['Internal Events'],
      operationId: 'listEventOrganizers',
      security: [{ sessionCookie: [] }],
      request: { params: z.object({ eventId: z.string() }) },
      responses: response,
   });
   registry.registerPath({
      method: 'post',
      path: '/api/internal/events/{eventId}/organizers',
      tags: ['Internal Events'],
      operationId: 'addEventOrganizer',
      security: [{ sessionCookie: [] }],
      request: { params: z.object({ eventId: z.string() }) },
      responses: { ...response, 201: { description: 'Created' } },
   });
   for (const method of ['patch', 'delete'] as const)
      registry.registerPath({
         method,
         path: '/api/internal/events/{eventId}/organizers/{userId}',
         tags: ['Internal Events'],
         operationId:
            method === 'patch'
               ? 'updateEventOrganizer'
               : 'removeEventOrganizer',
         security: [{ sessionCookie: [] }],
         request: {
            params: z.object({ eventId: z.string(), userId: z.string() }),
         },
         responses: response,
      });
   for (const action of ['publish', 'close', 'cancel'] as const)
      registry.registerPath({
         method: 'post',
         path: `/api/internal/events/{eventId}/${action}`,
         tags: ['Internal Events'],
         operationId: `${action}Event`,
         security: [{ sessionCookie: [] }],
         request: { params: z.object({ eventId: z.string() }) },
         responses: response,
      });
   for (const method of ['get', 'put'] as const)
      registry.registerPath({
         method,
         path: '/api/internal/events/{eventId}/registration-settings',
         tags: ['Internal Events'],
         operationId:
            method === 'get'
               ? 'getEventRegistrationSettings'
               : 'updateEventRegistrationSettings',
         security: [{ sessionCookie: [] }],
         request: {
            params: z.object({ eventId: z.string() }),
            ...(method === 'put' && {
               body: {
                  required: true,
                  content: {
                     'application/json': { schema: RegistrationSettingsSchema },
                  },
               },
            }),
         },
         responses: {
            200: {
               description: 'Event registration settings returned.',
               content: {
                  'application/json': {
                     schema: EventRegistrationSettingsResponse,
                  },
               },
            },
            401: response[401],
            403: response[403],
            404: response[404],
         },
      });
};
