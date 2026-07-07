import '@/docs/zodOpenApi.js';
import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import {
   errorResponseSchema,
   eventStatusSchema,
   paginationMetaSchema,
   protectedEndpoint,
   subeventStatusSchema,
   subeventTypeSchema,
   subeventVisibilitySchema,
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

const eventListQuerySchema = z.object({
   page: z.coerce.number().min(1).optional(),
   limit: z.coerce.number().min(1).max(100).optional(),
   search: z.string().optional(),
   sort: z.string().optional(),
   status: eventStatusSchema.optional(),
   visibility: subeventVisibilitySchema.optional(),
});

const subEventListItemSchema = z.object({
   id: z.string(),
   eventId: z.string(),
   name: z.string(),
   date: z.string().datetime(),
   type: subeventTypeSchema,
   visibility: subeventVisibilitySchema,
   status: subeventStatusSchema,
});

const eventListItemSchema = z.object({
   id: z.string(),
   name: z.string(),
   publicDescription: z.string().nullable(),
   coverImageUrl: z.string().nullable(),
   status: eventStatusSchema,
   createdAt: z.string().datetime(),
   updatedAt: z.string().datetime().nullable(),
   subevents: z.array(subEventListItemSchema),
});

const eventListResponseSchema = z.object({
   msg: z.literal('success'),
   data: z.array(eventListItemSchema),
   meta: paginationMetaSchema,
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
   const EventListResponse = registry.register(
      'EventListResponse',
      eventListResponseSchema,
   );

   registry.registerPath({
      method: 'get',
      path: '/api/event/get-list',
      tags: [tag],
      summary: 'List events assigned to the current user',
      description:
         'Requires authentication and manage_events permission. Returns only ' +
         'events where the current user is assigned in EventComittee.',
      security: [protectedEndpoint],
      request: {
         query: eventListQuerySchema,
      },
      responses: {
         200: {
            description: 'Committee-scoped event list.',
            content: {
               'application/json': {
                  schema: EventListResponse,
               },
            },
         },
         400: {
            description: 'Validation error, including invalid sort format.',
            content: {
               'application/json': {
                  schema: validationErrorResponseSchema.or(errorResponseSchema),
               },
            },
         },
         401: { description: 'Authentication required.' },
         403: { description: 'Missing manage_events permission.' },
      },
   });

   registry.registerPath({
      method: 'post',
      path: '/api/event/create-event',
      tags: [tag],
      summary: 'Create an event',
      description: 'Requires authentication and manage_events permission.',
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
