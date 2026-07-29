import '@/docs/zodOpenApi.js';
import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import {
   errorResponseSchema,
   eventStatusSchema,
   idParamSchema,
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
   coverImageUrl: z.string().nullable().optional(),
   status: eventStatusSchema.optional(),
});

const updateEventRequestSchema = z.object({
   name: z.string().min(1).optional(),
   publicDescription: z.string().nullable().optional(),
   coverImageUrl: z.string().nullable().optional(),
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
   locationUrl: z.string().nullable(),
   posterUrl: z.string().nullable(),
   destinationUrl: z.string().nullable(),
   position: z.number().int(),
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

const publishedSubEventSchema = z.object({
   id: z.string(),
   name: z.string(),
   publicDescription: z.string().nullable(),
   date: z.string().datetime(),
   type: subeventTypeSchema,
   locationName: z.string().nullable(),
   locationUrl: z.string().nullable(),
   posterUrl: z.string().nullable(),
   destinationUrl: z.string().nullable(),
   position: z.number().int().nonnegative(),
   price: z.number().int(),
   maxParticipants: z.number().int().nullable(),
   isRegistrationOpen: z.boolean(),
});

const publishedEventSchema = z.object({
   id: z.string(),
   name: z.string(),
   publicDescription: z.string().nullable(),
   coverImageUrl: z.string().nullable(),
   subevents: z.array(publishedSubEventSchema),
});

const publishedEventListResponseSchema = z.object({
   msg: z.literal('success'),
   data: z.array(publishedEventSchema),
});

const publishedEventDetailResponseSchema = z.object({
   msg: z.literal('success'),
   data: publishedEventSchema,
});

const subEventOrderRequestSchema = z.object({
   subEventIds: z.array(z.string().min(1)),
});

const subEventOrderResponseSchema = z.object({
   msg: z.literal('success'),
   data: z.array(
      z.object({ id: z.string(), position: z.number().int().nonnegative() }),
   ),
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
   const UpdateEventRequest = registry.register(
      'UpdateEventRequest',
      updateEventRequestSchema,
   );
   const EventListResponse = registry.register(
      'EventListResponse',
      eventListResponseSchema,
   );
   const PublishedEventListResponse = registry.register(
      'PublishedEventListResponse',
      publishedEventListResponseSchema,
   );
   const PublishedEventDetailResponse = registry.register(
      'PublishedEventDetailResponse',
      publishedEventDetailResponseSchema,
   );
   const SubEventOrderRequest = registry.register(
      'SubEventOrderRequest',
      subEventOrderRequestSchema,
   );
   const SubEventOrderResponse = registry.register(
      'SubEventOrderResponse',
      subEventOrderResponseSchema,
   );

   registry.registerPath({
      method: 'get',
      path: '/api/event/published',
      tags: [tag],
      summary: 'List published events for members',
      description:
         'Requires authentication. Returns published events that have OPEN, ' +
         'PUBLIC or INTERNAL sub-events, regardless of registration availability. ' +
         'INVITE_ONLY sub-events are excluded.',
      security: [protectedEndpoint],
      responses: {
         200: {
            description: 'Published events and safe public sub-event fields.',
            content: {
               'application/json': { schema: PublishedEventListResponse },
            },
         },
         401: { description: 'Authentication required.' },
      },
   });

   registry.registerPath({
      method: 'get',
      path: '/api/event/published/{id}',
      tags: [tag],
      summary: 'Get a published event for members',
      description:
         'Requires authentication. Returns the same safe event shape as the ' +
         'published list when the event has an OPEN, PUBLIC or INTERNAL sub-event. ' +
         'INVITE_ONLY sub-events are excluded.',
      security: [protectedEndpoint],
      request: { params: idParamSchema },
      responses: {
         200: {
            description: 'Published event detail.',
            content: {
               'application/json': { schema: PublishedEventDetailResponse },
            },
         },
         401: { description: 'Authentication required.' },
         404: {
            description: 'Published event not found or unavailable.',
            content: { 'application/json': { schema: errorResponseSchema } },
         },
      },
   });

   registry.registerPath({
      method: 'put',
      path: '/api/event/{id}/sub-events/order',
      tags: [tag],
      summary: 'Reorder all sub-events in an event',
      description:
         'Requires manage_events permission and either Admin role or steering ' +
         'committee membership. Every event sub-event ID must appear once.',
      security: [protectedEndpoint],
      request: {
         params: idParamSchema,
         body: {
            required: true,
            content: { 'application/json': { schema: SubEventOrderRequest } },
         },
      },
      responses: {
         200: {
            description: 'Sub-events reordered transactionally.',
            content: {
               'application/json': { schema: SubEventOrderResponse },
            },
         },
         400: {
            description: 'The order is incomplete or contains duplicate IDs.',
            content: {
               'application/json': { schema: validationErrorResponseSchema },
            },
         },
         401: { description: 'Authentication required.' },
         403: {
            description:
               'Missing manage_events permission, Admin role, or steering committee membership.',
         },
         404: {
            description: 'Event not found.',
            content: { 'application/json': { schema: errorResponseSchema } },
         },
      },
   });

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

   registry.registerPath({
      method: 'patch',
      path: '/api/event/update-event/{id}',
      tags: [tag],
      summary: 'Update an event',
      description:
         'Requires authentication, manage_events permission, and either Admin ' +
         'role or steering committee membership. If status is CANCELLED, the ' +
         'event cancellation flow is applied.',
      security: [protectedEndpoint],
      request: {
         params: idParamSchema,
         body: {
            required: true,
            content: {
               'application/json': {
                  schema: UpdateEventRequest,
               },
            },
         },
      },
      responses: {
         200: {
            description: 'Event updated.',
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
         401: { description: 'Authentication required.' },
         403: {
            description:
               'Missing manage_events permission, Admin role, or steering committee membership.',
         },
         404: {
            description: 'Event not found.',
            content: {
               'application/json': {
                  schema: errorResponseSchema,
               },
            },
         },
      },
   });

   registry.registerPath({
      method: 'patch',
      path: '/api/event/delete/{id}',
      tags: [tag],
      summary: 'Cancel an event',
      description:
         'Requires authentication, manage_events permission, and either Admin ' +
         'role or steering committee membership. Cancels the event, related ' +
         'sub-events, and closes related registration forms.',
      security: [protectedEndpoint],
      request: {
         params: idParamSchema,
      },
      responses: {
         200: {
            description: 'Event cancelled.',
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
         401: { description: 'Authentication required.' },
         403: {
            description:
               'Missing manage_events permission, Admin role, or steering committee membership.',
         },
         404: {
            description: 'Event not found.',
            content: {
               'application/json': {
                  schema: errorResponseSchema,
               },
            },
         },
      },
   });
};
