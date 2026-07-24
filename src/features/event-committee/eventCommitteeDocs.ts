import '@/docs/zodOpenApi.js';
import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import {
   errorResponseSchema,
   protectedEndpoint,
   successResponseSchema,
   validationErrorResponseSchema,
} from '@/docs/commonSchemas.js';

const tag = 'Event committees';

const committeeRoleSchema = z.enum([
   'ADVISOR',
   'CHAIRPERSON',
   'VICE_CHAIRPERSON',
   'SECRETARY',
   'TREASURER',
   'COORDINATOR',
   'STAFF',
]);

const eventIdParamSchema = z.object({
   eventId: z.string(),
});

const committeeUserSchema = z.object({
   id: z.string(),
   name: z.string(),
   email: z.string().email(),
   image: z.string().nullable(),
});

const eventCommitteeSchema = z.object({
   eventId: z.string(),
   userId: z.string(),
   role: committeeRoleSchema,
   assignedAt: z.string().datetime(),
   user: committeeUserSchema,
});

const assignEventCommitteeRequestSchema = z.object({
   eventId: z.string(),
   userId: z.string(),
   role: committeeRoleSchema.optional(),
});

const updateEventCommitteeRequestSchema = z.object({
   eventId: z.string(),
   userId: z.string(),
   role: committeeRoleSchema,
});

const removeEventCommitteeRequestSchema = z.object({
   eventId: z.string(),
   userId: z.string(),
});

const eventCommitteeListResponseSchema = z.object({
   msg: z.literal('success'),
   data: z.array(eventCommitteeSchema),
});

const eventCommitteeMutationResponseSchema = z.object({
   msg: z.literal('success'),
   data: eventCommitteeSchema,
});

export const registerEventCommitteeDocs = (registry: OpenAPIRegistry) => {
   const AssignEventCommitteeRequest = registry.register(
      'AssignEventCommitteeRequest',
      assignEventCommitteeRequestSchema,
   );
   const UpdateEventCommitteeRequest = registry.register(
      'UpdateEventCommitteeRequest',
      updateEventCommitteeRequestSchema,
   );
   const RemoveEventCommitteeRequest = registry.register(
      'RemoveEventCommitteeRequest',
      removeEventCommitteeRequestSchema,
   );
   const EventCommitteeListResponse = registry.register(
      'EventCommitteeListResponse',
      eventCommitteeListResponseSchema,
   );
   const EventCommitteeMutationResponse = registry.register(
      'EventCommitteeMutationResponse',
      eventCommitteeMutationResponseSchema,
   );

   registry.registerPath({
      method: 'get',
      path: '/api/event-committee/event/{eventId}',
      tags: [tag],
      summary: 'List an event committee',
      description:
         'Requires manage_events permission. Admin users can view any event; ' +
         'other users must be assigned to the requested event committee.',
      security: [protectedEndpoint],
      request: { params: eventIdParamSchema },
      responses: {
         200: {
            description: 'Event committee members.',
            content: {
               'application/json': { schema: EventCommitteeListResponse },
            },
         },
         401: { description: 'Authentication required.' },
         403: { description: 'Missing permission or committee membership.' },
         404: {
            description: 'Event not found.',
            content: { 'application/json': { schema: errorResponseSchema } },
         },
      },
   });

   registry.registerPath({
      method: 'post',
      path: '/api/event-committee',
      tags: [tag],
      summary: 'Assign an event committee member',
      description:
         'Requires manage_events permission and either Admin role or steering ' +
         'committee membership. Role defaults to STAFF.',
      security: [protectedEndpoint],
      request: {
         body: {
            required: true,
            content: {
               'application/json': { schema: AssignEventCommitteeRequest },
            },
         },
      },
      responses: {
         201: {
            description: 'Committee member assigned.',
            content: {
               'application/json': { schema: EventCommitteeMutationResponse },
            },
         },
         400: {
            description: 'Validation or inactive-user error.',
            content: {
               'application/json': {
                  schema: validationErrorResponseSchema.or(errorResponseSchema),
               },
            },
         },
         401: { description: 'Authentication required.' },
         403: { description: 'Missing permission or management access.' },
         404: { description: 'Event or user not found.' },
         409: {
            description: 'User is already assigned to the event.',
            content: { 'application/json': { schema: errorResponseSchema } },
         },
      },
   });

   registry.registerPath({
      method: 'patch',
      path: '/api/event-committee',
      tags: [tag],
      summary: 'Update an event committee role',
      description:
         'Requires management access and prevents demoting the final steering ' +
         'committee member.',
      security: [protectedEndpoint],
      request: {
         body: {
            required: true,
            content: {
               'application/json': { schema: UpdateEventCommitteeRequest },
            },
         },
      },
      responses: {
         200: {
            description: 'Committee role updated.',
            content: {
               'application/json': { schema: EventCommitteeMutationResponse },
            },
         },
         400: {
            description: 'Validation or last-steering-member error.',
            content: {
               'application/json': {
                  schema: validationErrorResponseSchema.or(errorResponseSchema),
               },
            },
         },
         401: { description: 'Authentication required.' },
         403: { description: 'Missing permission or management access.' },
         404: { description: 'Event or membership not found.' },
      },
   });

   registry.registerPath({
      method: 'delete',
      path: '/api/event-committee',
      tags: [tag],
      summary: 'Remove an event committee member',
      description:
         'Requires management access and prevents removing the final steering ' +
         'committee member.',
      security: [protectedEndpoint],
      request: {
         body: {
            required: true,
            content: {
               'application/json': { schema: RemoveEventCommitteeRequest },
            },
         },
      },
      responses: {
         200: {
            description: 'Committee member removed.',
            content: { 'application/json': { schema: successResponseSchema } },
         },
         400: {
            description: 'Validation or last-steering-member error.',
            content: {
               'application/json': {
                  schema: validationErrorResponseSchema.or(errorResponseSchema),
               },
            },
         },
         401: { description: 'Authentication required.' },
         403: { description: 'Missing permission or management access.' },
         404: { description: 'Event or membership not found.' },
      },
   });
};
