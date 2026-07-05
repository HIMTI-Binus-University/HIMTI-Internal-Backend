import '@/docs/zodOpenApi.js';
import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import {
   errorResponseSchema,
   eventStatusSchema,
   protectedEndpoint,
   validationErrorResponseSchema,
} from '@/docs/commonSchemas.js';

const tag = 'Events';

const eventSchema = z.object({
   id: z.string(),
   name: z.string(),
   publicDescription: z.string().nullable(),
   coverImageUrl: z.string().nullable(),
   status: eventStatusSchema,
   createdAt: z.string().datetime(),
   createdBy: z.string(),
   updatedAt: z.string().datetime().nullable(),
   updatedBy: z.string().nullable(),
});

const createEventRequestSchema = z.object({
   name: z.string(),
   publicDescription: z.string(),
   coverImageUrl: z.string(),
   status: eventStatusSchema.optional(),
});

const eventMutationResponseSchema = z.object({
   msg: z.literal('success'),
   data: eventSchema,
});

export const registerEventDocs = (registry: OpenAPIRegistry) => {
   const CreateEventRequest = registry.register(
      'CreateEventRequest',
      createEventRequestSchema,
   );
   const EventMutationResponse = registry.register(
      'EventMutationResponse',
      eventMutationResponseSchema,
   );

   registry.registerPath({
      method: 'post',
      path: '/api/event/create-event',
      tags: [tag],
      summary: 'Create an event',
      description: 'Requires authentication.',
      security: [protectedEndpoint],
      request: {
         body: {
            required: true,
            content: {
               'application/json': {
                  schema: CreateEventRequest,
               },
            },
         },
      },
      responses: {
         200: {
            description: 'Event created.',
            content: {
               'application/json': {
                  schema: EventMutationResponse,
               },
            },
         },
         400: {
            description: 'Validation error.',
            content: {
               'application/json': {
                  schema: validationErrorResponseSchema,
               },
            },
         },
         401: {
            description: 'Authentication required.',
            content: {
               'application/json': {
                  schema: errorResponseSchema,
               },
            },
         },
      },
   });
};
