import '@/docs/zodOpenApi.js';
import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import {
   errorResponseSchema,
   eventStatusSchema,
   idParamSchema,
   paginationMetaSchema,
   protectedEndpoint,
   registrationFormStatusSchema,
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
   publicDescription: z.string().nullable(),
   privateDescription: z.string().nullable(),
   date: z.string().datetime(),
   type: subeventTypeSchema,
   locationName: z.string().nullable(),
   locationUrl: z.string().nullable(),
   price: z.number(),
   paid: z.boolean(),
   paymentAccountBank: z.string(),
   paymentAccountNumber: z.number().nullable(),
   paymentAccountName: z.string().nullable(),
   priceModifier: z.number().nullable(),
   paymentDesc: z.string(),
   maxParticipants: z.number().nullable(),
   maxTicketsPerUser: z.number().nullable(),
   isRegistrationOpen: z.boolean(),
   autoAcceptRegistration: z.boolean(),
   visibility: subeventVisibilitySchema,
   status: subeventStatusSchema,
   createdAt: z.string().datetime(),
   createdBy: z.string(),
   updatedAt: z.string().datetime().nullable(),
   updatedBy: z.string().nullable(),
   registrationForms: z.array(
      z.object({
         id: z.string(),
         status: registrationFormStatusSchema,
         questionCount: z.number(),
      }),
   ),
   participantCount: z.number(),
   submittedResponseCount: z.number(),
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

const eventDetailSchema = eventListItemSchema.extend({
   createdBy: z.string(),
   updatedBy: z.string().nullable(),
});

const eventListResponseSchema = z.object({
   msg: z.literal('success'),
   data: z.array(eventListItemSchema),
   meta: paginationMetaSchema,
});

const eventDetailResponseSchema = z.object({
   msg: z.literal('success'),
   data: eventDetailSchema,
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
   const UpdateEventRequest = registry.register(
      'UpdateEventRequest',
      updateEventRequestSchema,
   );
   const EventListResponse = registry.register(
      'EventListResponse',
      eventListResponseSchema,
   );
   const EventDetailResponse = registry.register(
      'EventDetailResponse',
      eventDetailResponseSchema,
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
      method: 'get',
      path: '/api/event/get-list/{id}',
      tags: [tag],
      summary: 'Get an event by ID',
      description:
         'Requires authentication and manage_events permission. Admin users ' +
         'can view any event; other users must be assigned to its EventComittee.',
      security: [protectedEndpoint],
      request: {
         params: idParamSchema,
      },
      responses: {
         200: {
            description: 'Event detail with enriched sub-event summaries.',
            content: {
               'application/json': {
                  schema: EventDetailResponse,
               },
            },
         },
         401: { description: 'Authentication required.' },
         403: {
            description:
               'Missing manage_events permission or committee access.',
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
