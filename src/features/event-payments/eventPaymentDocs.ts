import '@/docs/zodOpenApi.js';
import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import {
   canonicalErrorResponseSchema,
   canonicalValidationErrorResponseSchema,
   paginationMetaSchema,
} from '@/docs/commonSchemas.js';
import {
   acceptedProofTypes,
   internalPaymentDetailSchema,
   internalPaymentQueueRowSchema,
   participantPaymentDetailSchema,
   paymentDecisionSchema,
   paymentQueueSchema,
   paymentRejectSchema,
   paymentReviewResultSchema,
   paymentSettingsResponseSchema,
   paymentSettingsSchema,
} from './eventPaymentSchema.js';

const security = [{ sessionCookie: [] }];
const idParams = z.object({ id: z.string() });
const registrationParams = z.object({ registrationId: z.string() });
const subEventParams = z.object({ subEventId: z.string() });
const success = <T extends z.ZodType>(schema: T) =>
   z.object({ msg: z.literal('success'), data: schema });
const jsonResponse = (schema: z.ZodType, description: string) => ({
   description,
   content: { 'application/json': { schema } },
});

export const registerEventPaymentDocs = (registry: OpenAPIRegistry) => {
   const Settings = registry.register(
      'EventPaymentSettingsV1',
      paymentSettingsResponseSchema,
   );
   const ParticipantDetail = registry.register(
      'ParticipantEventPaymentDetailV1',
      participantPaymentDetailSchema,
   );
   const QueueRow = registry.register(
      'InternalEventPaymentQueueRowV1',
      internalPaymentQueueRowSchema,
   );
   const InternalDetail = registry.register(
      'InternalEventPaymentDetailV1',
      internalPaymentDetailSchema,
   );
   const ReviewResult = registry.register(
      'EventPaymentReviewResultV1',
      paymentReviewResultSchema,
   );
   const ErrorResponse = registry.register(
      'EventPaymentErrorResponseV1',
      canonicalErrorResponseSchema,
   );
   const ValidationError = registry.register(
      'EventPaymentValidationErrorResponseV1',
      canonicalValidationErrorResponseSchema,
   );
   const errors = {
      400: jsonResponse(ValidationError, 'Request validation failed.'),
      401: jsonResponse(ErrorResponse, 'Authentication required.'),
      403: jsonResponse(ErrorResponse, 'Permission or event scope denied.'),
      404: jsonResponse(ErrorResponse, 'Payment or sub-event not found.'),
      409: jsonResponse(ErrorResponse, 'Revision or lifecycle conflict.'),
   };

   registry.registerPath({
      method: 'get',
      path: '/api/internal/sub-events/{subEventId}/payment-settings',
      operationId: 'getSubEventPaymentSettingsV1',
      tags: ['Event Payments'],
      summary: 'Get sub-event payment settings',
      security,
      request: { params: subEventParams },
      responses: {
         200: jsonResponse(success(Settings), 'Payment settings returned.'),
         ...errors,
      },
   });
   registry.registerPath({
      method: 'put',
      path: '/api/internal/sub-events/{subEventId}/payment-settings',
      operationId: 'updateSubEventPaymentSettingsV1',
      tags: ['Event Payments'],
      summary: 'Update payment settings',
      description:
         'Package terms remain controlled by the package API. For backward compatibility, an unreferenced one-seat DEFAULT-INDIVIDUAL package is created or has only its price/currency synchronized; referenced or non-one-seat packages are not mutated.',
      security,
      request: {
         params: subEventParams,
         body: {
            required: true,
            content: { 'application/json': { schema: paymentSettingsSchema } },
         },
      },
      responses: {
         200: jsonResponse(success(Settings), 'Payment settings updated.'),
         ...errors,
      },
   });
   registry.registerPath({
      method: 'get',
      path: '/api/internal/sub-events/{subEventId}/payments',
      operationId: 'listSubEventPaymentsV1',
      tags: ['Event Payments'],
      summary: 'List the deterministic sub-event payment queue',
      security,
      request: { params: subEventParams, query: paymentQueueSchema },
      responses: {
         200: jsonResponse(
            z.object({
               msg: z.literal('success'),
               data: z.array(QueueRow),
               meta: paginationMetaSchema,
            }),
            'Payment queue returned.',
         ),
         ...errors,
      },
   });
   registry.registerPath({
      method: 'get',
      path: '/api/internal/event-payments/{id}',
      operationId: 'getInternalEventPaymentDetailV1',
      tags: ['Event Payments'],
      summary: 'Get payment, proof metadata, and history',
      security,
      request: { params: idParams },
      responses: {
         200: jsonResponse(success(InternalDetail), 'Payment detail returned.'),
         ...errors,
      },
   });
   for (const decision of [
      {
         action: 'verify',
         operationId: 'verifyEventPaymentV1',
         body: paymentDecisionSchema,
      },
      {
         action: 'reject',
         operationId: 'rejectEventPaymentV1',
         body: paymentRejectSchema,
      },
   ] as const)
      registry.registerPath({
         method: 'post',
         path: `/api/internal/event-payments/{id}/${decision.action}`,
         operationId: decision.operationId,
         tags: ['Event Payments'],
         summary: `${decision.action === 'verify' ? 'Verify' : 'Reject'} the latest submitted proof`,
         security,
         request: {
            params: idParams,
            body: {
               required: true,
               content: { 'application/json': { schema: decision.body } },
            },
         },
         responses: {
            200: jsonResponse(success(ReviewResult), 'Payment reviewed.'),
            ...errors,
         },
      });
   registry.registerPath({
      method: 'get',
      path: '/api/me/event-registrations/{registrationId}/payment',
      operationId: 'getMyEventPaymentV1',
      tags: ['Event Payments'],
      summary: 'Get my authoritative registration payment state',
      security,
      request: { params: registrationParams },
      responses: {
         200: jsonResponse(success(ParticipantDetail), 'Payment returned.'),
         ...errors,
      },
   });
   registry.registerPath({
      method: 'post',
      path: '/api/me/event-payments/{id}/proof',
      operationId: 'submitMyEventPaymentProofV1',
      tags: ['Event Payments'],
      summary: 'Upload and submit one private payment proof',
      security,
      request: {
         params: idParams,
         body: {
            required: true,
            content: {
               'multipart/form-data': {
                  schema: z.object({
                     proof: z.string().openapi({
                        type: 'string',
                        format: 'binary',
                        description: `One of ${acceptedProofTypes.join(', ')}; maximum 10 MiB.`,
                     }),
                  }),
               },
            },
         },
      },
      responses: {
         201: jsonResponse(
            success(
               z.object({
                  paymentId: z.string(),
                  proofId: z.string(),
                  status: z.literal('PROOF_SUBMITTED'),
               }),
            ),
            'Proof submitted.',
         ),
         ...errors,
         413: jsonResponse(ErrorResponse, 'Proof exceeds the allowed size.'),
      },
   });
   registry.registerPath({
      method: 'get',
      path: '/api/private/payment-proofs/{id}/content',
      operationId: 'getPrivatePaymentProofContentV1',
      tags: ['Event Payments'],
      summary: 'Stream authorized private proof content',
      security,
      request: { params: idParams },
      responses: {
         200: {
            description: 'Private proof content.',
            content: Object.fromEntries(
               acceptedProofTypes.map((mediaType) => [
                  mediaType,
                  {
                     schema: z
                        .string()
                        .openapi({ type: 'string', format: 'binary' }),
                  },
               ]),
            ),
         },
         401: jsonResponse(ErrorResponse, 'Authentication required.'),
         404: jsonResponse(
            ErrorResponse,
            'Proof unavailable or authorization denied.',
         ),
      },
   });
};
