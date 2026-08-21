import '@/docs/zodOpenApi.js';
import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import {
   cancelRegistrationSchema,
   createEventRegistrationSchema,
   eventRegistrationPaginationSchema,
   paginatedSuccessSchema,
   publicEventSchema,
   registrationContextQuerySchema,
   registrationContextSchema,
   registrationDetailSchema,
   registrationSummarySchema,
   replaceRegistrationResponsesSchema,
   successSchema,
   internalRegistrationListSchema,
   internalQueueQuerySchema,
   registrationDecisionSchema,
   registrationReasonDecisionSchema,
   bulkRegistrationDecisionSchema,
   bulkRegistrationReasonDecisionSchema,
   internalRegistrationSummarySchema,
   internalRegistrationDetailSchema,
   internalCapacitySchema,
   internalQueueNeighborsSchema,
   internalReviewResultSchema,
} from './eventRegistrationSchema.js';
import {
   errorResponseSchema,
   validationErrorResponseSchema,
} from '@/docs/commonSchemas.js';

const tag = 'Event registrations V1';
const security = [{ sessionCookie: [] }];
const idParams = z.object({ registrationId: z.string() });
const eventParams = z.object({ eventId: z.string() });
const subEventParams = z.object({ subEventId: z.string() });
const internalParams = z.object({
   registrationId: z.string(),
});
const errors = {
   400: {
      description: 'Validation or form-answer error.',
      content: {
         'application/json': {
            schema: validationErrorResponseSchema.or(errorResponseSchema),
         },
      },
   },
   409: {
      description:
         'Capacity, revision, duplicate, idempotency, or lifecycle conflict.',
      content: { 'application/json': { schema: errorResponseSchema } },
   },
   422: {
      description:
         'Bundle packages and generic FILE-question flows are unsupported at this checkpoint; paid one-seat registration is supported.',
      content: { 'application/json': { schema: errorResponseSchema } },
   },
};
const forbiddenResponse = {
   description: 'Account or registration eligibility failed.',
   content: { 'application/json': { schema: errorResponseSchema } },
};
const notFoundResponse = {
   description: 'Resource not found, including unauthorized private access.',
   content: { 'application/json': { schema: errorResponseSchema } },
};

export const registerEventRegistrationDocs = (registry: OpenAPIRegistry) => {
   const InternalList = registry.register(
      'InternalRegistrationQueueV1',
      paginatedSuccessSchema(internalRegistrationSummarySchema),
   );
   const InternalCapacity = registry.register(
      'InternalRegistrationCapacityV1',
      successSchema(internalCapacitySchema),
   );
   const InternalDetail = registry.register(
      'InternalRegistrationDetailV1',
      successSchema(internalRegistrationDetailSchema),
   );
   const InternalNeighbors = registry.register(
      'InternalRegistrationQueueNeighborsV1',
      successSchema(internalQueueNeighborsSchema),
   );
   const InternalReview = registry.register(
      'InternalRegistrationReviewResultV1',
      successSchema(internalReviewResultSchema),
   );
   const InternalBulkReview = registry.register(
      'InternalRegistrationBulkReviewResultV1',
      successSchema(z.array(internalReviewResultSchema)),
   );
   registry.registerPath({
      method: 'get',
      path: '/api/v1/internal/sub-events/{subEventId}/registrations',
      operationId: 'listInternalEventRegistrationsV1',
      tags: [tag],
      summary: 'List scoped internal registrations',
      security,
      request: {
         params: subEventParams,
         query: internalRegistrationListSchema,
      },
      responses: {
         200: {
            description: 'Paginated registration queue.',
            content: { 'application/json': { schema: InternalList } },
         },
         401: { description: 'Authentication required.' },
         403: forbiddenResponse,
      },
   });
   registry.registerPath({
      method: 'get',
      path: '/api/v1/internal/sub-events/{subEventId}/registrations/capacity',
      operationId: 'getInternalRegistrationCapacityV1',
      tags: [tag],
      summary: 'Get capacity summary',
      security,
      request: { params: subEventParams },
      responses: {
         200: {
            description: 'Sub-event capacity totals.',
            content: { 'application/json': { schema: InternalCapacity } },
         },
         401: { description: 'Authentication required.' },
         403: forbiddenResponse,
      },
   });
   registry.registerPath({
      method: 'get',
      path: '/api/v1/internal/event-registrations/{registrationId}',
      operationId: 'getInternalEventRegistrationV1',
      tags: [tag],
      summary: 'Get permission-aware registration detail',
      description:
         'Committee, creator, steering, or Admin event scope is required. Answers require view_event_answers. FILE answers expose availability only, never raw keys.',
      security,
      request: { params: internalParams },
      responses: {
         200: {
            description: 'Grouped section answers and status history.',
            content: { 'application/json': { schema: InternalDetail } },
         },
         401: { description: 'Authentication required.' },
         403: forbiddenResponse,
         404: notFoundResponse,
      },
   });
   registry.registerPath({
      method: 'get',
      path: '/api/v1/internal/sub-events/{subEventId}/registrations/{registrationId}/neighbors',
      operationId: 'getInternalRegistrationQueueNeighborsV1',
      tags: [tag],
      summary: 'Get stable filtered queue neighbors',
      security,
      request: {
         params: z.object({
            subEventId: z.string(),
            registrationId: z.string(),
         }),
         query: internalQueueQuerySchema,
      },
      responses: {
         200: {
            description: 'Previous and next records.',
            content: { 'application/json': { schema: InternalNeighbors } },
         },
         401: { description: 'Authentication required.' },
         403: forbiddenResponse,
         404: notFoundResponse,
      },
   });
   const actions = [
      [
         'approve',
         'approveInternalEventRegistrationV1',
         registrationDecisionSchema,
      ],
      [
         'reject',
         'rejectInternalEventRegistrationV1',
         registrationReasonDecisionSchema,
      ],
      [
         'request-correction',
         'requestInternalRegistrationCorrectionV1',
         registrationReasonDecisionSchema,
      ],
      [
         'admin-cancel',
         'adminCancelInternalEventRegistrationV1',
         registrationReasonDecisionSchema,
      ],
   ] as const;
   for (const [action, operationId, body] of actions) {
      registry.registerPath({
         method: 'post',
         path: `/api/v1/internal/event-registrations/{registrationId}/${action}`,
         operationId,
         tags: [tag],
         summary: `${action} a registration`,
         description:
            'Requires review_event_registrations, committee/creator/Admin event scope, and revision CAS.',
         security,
         request: {
            params: internalParams,
            body: {
               required: true,
               content: { 'application/json': { schema: body } },
            },
         },
         responses: {
            200: {
               description: 'Transition completed.',
               content: { 'application/json': { schema: InternalReview } },
            },
            400: errors[400],
            401: { description: 'Authentication required.' },
            403: forbiddenResponse,
            404: notFoundResponse,
            409: errors[409],
         },
      });
   }
   const bulkActions = [
      [
         'bulk-approve',
         'bulkApproveInternalEventRegistrationsV1',
         bulkRegistrationDecisionSchema,
      ],
      [
         'bulk-reject',
         'bulkRejectInternalEventRegistrationsV1',
         bulkRegistrationReasonDecisionSchema,
      ],
      [
         'bulk-cancel',
         'bulkCancelInternalEventRegistrationsV1',
         bulkRegistrationReasonDecisionSchema,
      ],
   ] as const;
   for (const [action, operationId, body] of bulkActions) {
      registry.registerPath({
         method: 'post',
         path: `/api/v1/internal/sub-events/{subEventId}/registrations/${action}`,
         operationId,
         tags: [tag],
         summary: `${action} atomically`,
         description:
            'Bounded to 50 items; any stale or invalid item rolls back all changes.',
         security,
         request: {
            params: subEventParams,
            body: {
               required: true,
               content: { 'application/json': { schema: body } },
            },
         },
         responses: {
            200: {
               description: 'Atomic transitions completed.',
               content: {
                  'application/json': { schema: InternalBulkReview },
               },
            },
            400: errors[400],
            401: { description: 'Authentication required.' },
            403: forbiddenResponse,
            404: notFoundResponse,
            409: errors[409],
         },
      });
   }
   const EventList = registry.register(
      'PublicEventListV1',
      paginatedSuccessSchema(publicEventSchema),
   );
   const EventDetail = registry.register(
      'PublicEventDetailV1',
      successSchema(publicEventSchema),
   );
   const Context = registry.register(
      'RegistrationContextV1',
      successSchema(registrationContextSchema),
   );
   const Detail = registry.register(
      'EventRegistrationDetailV1',
      successSchema(registrationDetailSchema),
   );
   const List = registry.register(
      'EventRegistrationListV1',
      paginatedSuccessSchema(registrationSummarySchema),
   );
   const Create = registry.register(
      'CreateEventRegistrationV1',
      createEventRegistrationSchema,
   );
   const Replace = registry.register(
      'ReplaceRegistrationResponsesV1',
      replaceRegistrationResponsesSchema,
   );

   registry.registerPath({
      method: 'get',
      path: '/api/v1/events',
      operationId: 'listPublicEventsV1',
      tags: [tag],
      summary: 'List published events',
      request: { query: eventRegistrationPaginationSchema },
      responses: {
         200: {
            description: 'Public-safe event list.',
            content: { 'application/json': { schema: EventList } },
         },
         400: errors[400],
      },
   });
   registry.registerPath({
      method: 'get',
      path: '/api/v1/events/{eventId}',
      operationId: 'getPublicEventV1',
      tags: [tag],
      summary: 'Get published event detail',
      request: { params: eventParams },
      responses: {
         200: {
            description: 'Public-safe event detail.',
            content: { 'application/json': { schema: EventDetail } },
         },
         404: {
            description: 'Event not found.',
            content: { 'application/json': { schema: errorResponseSchema } },
         },
      },
   });
   registry.registerPath({
      method: 'get',
      path: '/api/v1/sub-events/{subEventId}/registration-context',
      operationId: 'getRegistrationContextV1',
      tags: [tag],
      summary: 'Resolve registration context',
      description:
         'Session is optional. Anonymous native registration returns SIGN_IN rather than HTTP 401.',
      request: {
         params: subEventParams,
         query: registrationContextQuerySchema,
      },
      responses: {
         200: {
            description: 'Registration action and safe context.',
            content: { 'application/json': { schema: Context } },
         },
         403: {
            description: 'Eligibility failed.',
            content: { 'application/json': { schema: errorResponseSchema } },
         },
         404: notFoundResponse,
         422: errors[422],
      },
   });
   registry.registerPath({
      method: 'post',
      path: '/api/v1/sub-events/{subEventId}/registrations',
      operationId: 'createEventRegistrationV1',
      tags: [tag],
      summary: 'Create or resume a draft registration',
      security,
      request: {
         params: subEventParams,
         body: {
            required: true,
            content: { 'application/json': { schema: Create } },
         },
      },
      responses: {
         200: {
            description: 'Draft registration.',
            content: { 'application/json': { schema: Detail } },
         },
         401: { description: 'Authentication required.' },
         403: forbiddenResponse,
         404: notFoundResponse,
         ...errors,
      },
   });
   registry.registerPath({
      method: 'get',
      path: '/api/v1/me/event-registrations',
      operationId: 'listMyEventRegistrationsV1',
      tags: [tag],
      summary: 'List owned/member registrations',
      security,
      request: { query: eventRegistrationPaginationSchema },
      responses: {
         200: {
            description: 'Registration list.',
            content: { 'application/json': { schema: List } },
         },
         401: { description: 'Authentication required.' },
         403: forbiddenResponse,
      },
   });
   registry.registerPath({
      method: 'get',
      path: '/api/v1/me/event-registrations/{registrationId}',
      operationId: 'getMyEventRegistrationV1',
      tags: [tag],
      summary: 'Get owned registration detail',
      security,
      request: { params: idParams },
      responses: {
         200: {
            description: 'Registration detail.',
            content: { 'application/json': { schema: Detail } },
         },
         401: { description: 'Authentication required.' },
         403: forbiddenResponse,
         404: notFoundResponse,
      },
   });
   registry.registerPath({
      method: 'put',
      path: '/api/v1/me/event-registrations/{registrationId}/response',
      operationId: 'replaceEventRegistrationResponsesV1',
      tags: [tag],
      summary: 'Replace submission responses',
      security,
      request: {
         params: idParams,
         body: {
            required: true,
            content: { 'application/json': { schema: Replace } },
         },
      },
      responses: {
         200: {
            description: 'Updated registration.',
            content: { 'application/json': { schema: Detail } },
         },
         401: { description: 'Authentication required.' },
         403: forbiddenResponse,
         404: notFoundResponse,
         400: errors[400],
         409: errors[409],
         422: errors[422],
      },
   });
   registry.registerPath({
      method: 'post',
      path: '/api/v1/me/event-registrations/{registrationId}/submit',
      operationId: 'submitEventRegistrationV1',
      tags: [tag],
      summary: 'Submit or resubmit a one-seat registration',
      security,
      request: {
         params: idParams,
         headers: z.object({ 'Idempotency-Key': z.string().min(8).max(255) }),
      },
      responses: {
         200: {
            description: 'Submitted registration or idempotent replay.',
            content: { 'application/json': { schema: Detail } },
         },
         401: { description: 'Authentication required.' },
         403: forbiddenResponse,
         404: notFoundResponse,
         400: errors[400],
         409: errors[409],
         422: errors[422],
      },
   });
   registry.registerPath({
      method: 'post',
      path: '/api/v1/me/event-registrations/{registrationId}/cancel',
      operationId: 'cancelEventRegistrationV1',
      tags: [tag],
      summary: 'Cancel the whole registration order',
      security,
      request: {
         params: idParams,
         body: {
            required: false,
            content: {
               'application/json': { schema: cancelRegistrationSchema },
            },
         },
      },
      responses: {
         200: {
            description: 'Cancelled registration or idempotent replay.',
            content: { 'application/json': { schema: Detail } },
         },
         401: { description: 'Authentication required.' },
         403: forbiddenResponse,
         404: notFoundResponse,
         409: errors[409],
      },
   });
};
