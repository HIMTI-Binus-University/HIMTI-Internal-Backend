import '@/docs/zodOpenApi.js';
import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import { protectedEndpoint } from '@/docs/commonSchemas.js';
import {
   internalPostRegistrationListQuerySchema,
   internalPostRegistrationListResponseSchema,
   postRegistrationAssignmentResponseSchema,
   postRegistrationCorrectionSchema,
   postRegistrationDetailResponseSchema,
   postRegistrationListResponseSchema,
   savePostRegistrationResponseSchema,
   submitPostRegistrationResponseSchema,
} from './postRegistrationFormSchema.js';

export const registerPostRegistrationFormDocs = (registry: OpenAPIRegistry) => {
   const assignment = registry.register(
      'PostRegistrationAssignmentV1',
      postRegistrationAssignmentResponseSchema,
   );
   const list = registry.register(
      'PostRegistrationAssignmentListResponseV1',
      postRegistrationListResponseSchema,
   );
   const detail = registry.register(
      'PostRegistrationAssignmentResponseV1',
      postRegistrationDetailResponseSchema,
   );
   const internalList = registry.register(
      'InternalPostRegistrationAssignmentListResponseV1',
      internalPostRegistrationListResponseSchema,
   );
   void assignment;
   const registrationParams = z.object({ registrationId: z.string() });
   const assignmentParams = registrationParams.extend({
      assignmentId: z.string(),
   });
   registry.registerPath({
      method: 'get',
      path: '/api/v1/me/event-registrations/{registrationId}/post-registration-assignments',
      operationId: 'listMyPostRegistrationAssignmentsV1',
      tags: ['Post-registration forms'],
      security: [protectedEndpoint],
      request: { params: registrationParams },
      responses: {
         200: {
            description: 'Exact durable assignments returned.',
            content: { 'application/json': { schema: list } },
         },
         401: { description: 'Authentication required.' },
         404: { description: 'Registration not found.' },
      },
   });
   registry.registerPath({
      method: 'get',
      path: '/api/v1/me/event-registrations/{registrationId}/post-registration-assignments/{assignmentId}',
      operationId: 'getMyPostRegistrationAssignmentV1',
      tags: ['Post-registration forms'],
      security: [protectedEndpoint],
      request: { params: assignmentParams },
      responses: {
         200: {
            description: 'Exact immutable form version returned.',
            content: { 'application/json': { schema: detail } },
         },
         401: { description: 'Authentication required.' },
         404: { description: 'Assignment not found.' },
      },
   });
   registry.registerPath({
      method: 'put',
      path: '/api/v1/me/event-registrations/{registrationId}/post-registration-assignments/{assignmentId}/response',
      operationId: 'saveMyPostRegistrationResponseV1',
      tags: ['Post-registration forms'],
      security: [protectedEndpoint],
      request: {
         params: assignmentParams,
         body: {
            required: true,
            content: {
               'application/json': {
                  schema: savePostRegistrationResponseSchema,
               },
            },
         },
      },
      responses: {
         200: {
            description: 'Draft replaced.',
            content: { 'application/json': { schema: detail } },
         },
         400: { description: 'Answer validation failed.' },
         409: { description: 'Window, lifecycle, or revision conflict.' },
      },
   });
   registry.registerPath({
      method: 'post',
      path: '/api/v1/me/event-registrations/{registrationId}/post-registration-assignments/{assignmentId}/submit',
      operationId: 'submitMyPostRegistrationResponseV1',
      tags: ['Post-registration forms'],
      security: [protectedEndpoint],
      request: {
         params: assignmentParams,
         headers: z.object({ 'Idempotency-Key': z.string().min(8) }),
         body: {
            required: true,
            content: {
               'application/json': {
                  schema: submitPostRegistrationResponseSchema,
               },
            },
         },
      },
      responses: {
         200: {
            description: 'Exact response locked without order mutation.',
            content: { 'application/json': { schema: detail } },
         },
         400: { description: 'Answer validation failed.' },
         409: {
            description:
               'Window, lifecycle, revision, or idempotency conflict.',
         },
      },
   });
   registry.registerPath({
      method: 'get',
      path: '/api/v1/internal/sub-events/{subEventId}/post-registration-assignments',
      operationId: 'listInternalPostRegistrationAssignmentsV1',
      tags: ['Post-registration forms'],
      security: [protectedEndpoint],
      request: {
         params: z.object({ subEventId: z.string() }),
         query: internalPostRegistrationListQuerySchema,
      },
      responses: {
         200: {
            description: 'Scoped assignment queue and summary returned.',
            content: { 'application/json': { schema: internalList } },
         },
         403: { description: 'Review permission or event scope denied.' },
      },
   });
   registry.registerPath({
      method: 'get',
      path: '/api/v1/internal/post-registration-assignments/{assignmentId}',
      operationId: 'getInternalPostRegistrationAssignmentV1',
      tags: ['Post-registration forms'],
      security: [protectedEndpoint],
      request: { params: z.object({ assignmentId: z.string() }) },
      responses: {
         200: {
            description:
               'Assignment returned; answers are redacted without view_event_answers.',
            content: { 'application/json': { schema: detail } },
         },
         403: { description: 'Review permission or event scope denied.' },
      },
   });
   for (const operation of [
      {
         suffix: 'request-correction',
         operationId: 'requestPostRegistrationCorrectionV1',
      },
      { suffix: 'reopen', operationId: 'reopenPostRegistrationAssignmentV1' },
   ])
      registry.registerPath({
         method: 'post',
         path: `/api/v1/internal/post-registration-assignments/{assignmentId}/${operation.suffix}`,
         operationId: operation.operationId,
         tags: ['Post-registration forms'],
         security: [protectedEndpoint],
         request: {
            params: z.object({ assignmentId: z.string() }),
            body: {
               required: true,
               content: {
                  'application/json': {
                     schema: postRegistrationCorrectionSchema,
                  },
               },
            },
         },
         responses: {
            200: {
               description: 'Audited assignment transition completed.',
               content: { 'application/json': { schema: detail } },
            },
            409: { description: 'Exact response state or revision conflict.' },
         },
      });
};
