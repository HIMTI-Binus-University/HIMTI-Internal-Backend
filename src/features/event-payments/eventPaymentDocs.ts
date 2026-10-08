import '@/docs/zodOpenApi.js';
import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import {
   PaymentRevisionSchema,
   PaymentCorrectionSchema,
   PaymentRejectSchema,
   PaymentQueueSchema,
} from './eventPaymentSchema.js';

export const paymentResponseSchema = z.object({
   id: z.string(),
   registrationId: z.string(),
   eventId: z.string(),
   eventName: z.string(),
   packageName: z.string(),
   status: z.enum([
      'COLLECTING',
      'REVIEW',
      'VERIFIED',
      'REJECTED',
      'EXPIRED',
      'CANCELLED',
   ]),
   orderStatus: z.enum([
      'ASSEMBLING',
      'PENDING_PAYMENT',
      'PAYMENT_REVIEW',
      'CONFIRMED',
      'EXPIRED',
      'CANCELLED',
      'REJECTED',
   ]),
   revision: z.number().int(),
   currency: z.string(),
   amountMinor: z.string(),
   bank: z
      .object({
         bankName: z.string().nullable(),
         accountNumber: z.string().nullable(),
         accountHolder: z.string().nullable(),
         instructions: z.string().nullable(),
      })
      .nullable(),
   expiresAt: z.string().datetime().nullable(),
   requiredCount: z.number().int(),
   acknowledgementCount: z.number().int(),
   allowedMediaTypes: z.array(z.string()),
   maxBytes: z.literal(1572864),
   members: z.array(
      z.object({
         id: z.string(),
         name: z.string().nullable(),
         email: z.string().nullable().optional(),
         correction: z
            .object({ reason: z.string(), deadlineAt: z.string().datetime() })
            .nullable(),
         proofs: z.array(
            z.object({
               id: z.string(),
               status: z.enum(['CURRENT', 'SUPERSEDED']),
               mediaType: z.string(),
               sizeBytes: z.number().int(),
               submittedAt: z.string().datetime(),
               contentUrl: z.string(),
            }),
         ),
      }),
   ),
});

export const registerEventPaymentDocs = (registry: OpenAPIRegistry) => {
   const payment = registry.register('EventPayment', paymentResponseSchema);
   const response = z.object({ msg: z.literal('success'), data: payment });
   const common = {
      tags: ['Event Payments'],
      security: [{ sessionCookie: [] }],
      responses: {
         200: {
            description: 'Payment returned.',
            content: { 'application/json': { schema: response } },
         },
         400: { description: 'Invalid input or proof content.' },
         401: { description: 'Authentication required.' },
         403: { description: 'Permission and event scope required.' },
         404: { description: 'Payment or proof not found.' },
         409: {
            description:
               'Revision, state, idempotency or deadline conflict. Reload before retrying.',
         },
         413: { description: 'Proof exceeds 1572864 bytes.' },
      },
   };
   registry.registerPath({
      ...common,
      method: 'get',
      path: '/api/me/event-registrations/{registrationId}/payment',
      operationId: 'getMyEventPayment',
      summary: 'Read shared payment with only your own proof metadata',
      request: { params: z.object({ registrationId: z.string() }) },
   });
   registry.registerPath({
      ...common,
      method: 'get',
      path: '/api/internal/events/{eventId}/registrations/{registrationId}/payment',
      operationId: 'getInternalEventRegistrationPayment',
      summary:
         'Get payment for a registration; requires review_event_payments and event scope',
      request: {
         params: z.object({ eventId: z.string(), registrationId: z.string() }),
      },
   });
   registry.registerPath({
      ...common,
      method: 'get',
      path: '/api/internal/event-payments/{paymentId}',
      operationId: 'getInternalEventPayment',
      summary:
         'Review all member acknowledgements; requires review_event_payments and event scope',
      request: { params: z.object({ paymentId: z.string() }) },
   });
   registry.registerPath({
      ...common,
      method: 'get',
      path: '/api/internal/events/{eventId}/payments',
      operationId: 'listInternalEventPayments',
      summary: 'List whole-order payments once, never once per proof',
      request: {
         params: z.object({ eventId: z.string() }),
         query: PaymentQueueSchema,
      },
      responses: {
         ...common.responses,
         200: {
            description: 'Payment queue.',
            content: {
               'application/json': {
                  schema: z.object({
                     msg: z.literal('success'),
                     data: z.array(payment),
                     meta: z.object({
                        page: z.number(),
                        limit: z.number(),
                        totalRecords: z.number(),
                        totalPages: z.number(),
                     }),
                  }),
               },
            },
         },
      },
   });
   for (const [action, schema] of [
      ['approve', PaymentRevisionSchema],
      ['request-correction', PaymentCorrectionSchema],
      ['reject', PaymentRejectSchema],
   ] as const)
      registry.registerPath({
         ...common,
         method: 'post',
         path: `/api/internal/event-payments/{paymentId}/${action}`,
         operationId:
            action === 'approve'
               ? 'approveEventPayment'
               : action === 'reject'
                 ? 'rejectEventPayment'
                 : 'requestEventPaymentCorrection',
         summary: `${action} whole-order payment; requires review_event_payments and event scope`,
         request: {
            params: z.object({ paymentId: z.string() }),
            body: {
               required: true,
               content: { 'application/json': { schema } },
            },
         },
      });
   registry.registerPath({
      ...common,
      method: 'post',
      path: '/api/me/event-payments/{paymentId}/acknowledgement',
      operationId: 'uploadEventPaymentAcknowledgement',
      summary:
         'Upload your own private proof copy; replacements preserve history',
      request: {
         params: z.object({ paymentId: z.string() }),
         headers: z.object({ 'Idempotency-Key': z.string().min(8).max(200) }),
         body: {
            required: true,
            content: {
               'multipart/form-data': {
                  schema: PaymentRevisionSchema.extend({
                     file: z
                        .string()
                        .openapi({ type: 'string', format: 'binary' }),
                  }),
               },
            },
         },
      },
   });
   registry.registerPath({
      ...common,
      method: 'get',
      path: '/api/private/payment-proofs/{proofId}/content',
      operationId: 'getEventPaymentProofContent',
      summary:
         'Private proof content for its uploader or scoped reviewer with view_payment_proofs',
      request: { params: z.object({ proofId: z.string() }) },
      responses: {
         ...common.responses,
         200: {
            description: 'Private file, no-store, sandboxed and nosniff.',
            content: {
               'application/octet-stream': {
                  schema: z
                     .string()
                     .openapi({ type: 'string', format: 'binary' }),
               },
            },
         },
      },
   });
};
