import '@/docs/zodOpenApi.js';
import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import {
   errorResponseSchema,
   protectedEndpoint,
   validationErrorResponseSchema,
} from '@/docs/commonSchemas.js';
import {
   attendanceListSchema,
   attendanceMutationSchema,
   manualCheckInSchema,
   scanTicketSchema,
   searchTicketSchema,
} from './eventTicketSchema.js';

const date = z.string().datetime();
const ticketStatus = z.enum([
   'PENDING',
   'ACTIVE',
   'USED',
   'EXPIRED',
   'REVOKED',
]);
const participant = z.object({ name: z.string(), email: z.string().email() });
const meta = z.object({
   page: z.number().int(),
   limit: z.number().int(),
   totalRecords: z.number().int(),
   totalPages: z.number().int(),
});
const ticket = z.object({
   id: z.string(),
   status: ticketStatus,
   issuedAt: date.nullable(),
   expiresAt: date.nullable(),
   subEvent: z.object({ id: z.string(), name: z.string(), date }),
   checkInEligibility: z.object({
      state: z.enum(['READY', 'BLOCKED_BY_FORMS', 'NOT_PRESENTABLE']),
      canPresentQr: z.boolean(),
      blockingForms: z.array(
         z.object({
            assignmentId: z.string(),
            registrationId: z.string(),
            formName: z.string(),
            availability: z.enum([
               'OPEN',
               'UPCOMING',
               'OVERDUE',
               'CORRECTION',
               'COMPLETED',
            ]),
            completion: z.enum([
               'NOT_STARTED',
               'DRAFT',
               'NEEDS_CORRECTION',
               'LOCKED',
            ]),
            canEdit: z.boolean(),
            canSubmit: z.boolean(),
         }),
      ),
   }),
});
const attendance = z.object({
   id: z.string(),
   checkedInAt: date,
   checkedOutAt: date.nullable(),
   voidedAt: date.nullable().optional(),
   revision: z.number().int(),
   source: z.string().nullable().optional(),
});
const resolved = z.object({
   ticketId: z.string(),
   status: ticketStatus,
   eligibility: z.object({
      eligible: z.boolean(),
      reason: z
         .enum(['TICKET_INELIGIBLE', 'REQUIRED_ATTENDEE_FORM_INCOMPLETE'])
         .nullable(),
   }),
   participant,
   orderNumber: z.string(),
});
const checkIn = resolved
   .omit({ ticketId: true, status: true, eligibility: true })
   .extend({
      record: attendance,
      state: z.enum(['CHECKED_IN', 'CHECKED_OUT']),
      replay: z.boolean(),
   });
const success = <T extends z.ZodType>(data: T) =>
   z.object({ msg: z.literal('success'), data });
const params = z.object({ subEventId: z.string() });
const responses = (schema: z.ZodType) => ({
   200: {
      description: 'Success.',
      content: { 'application/json': { schema } },
   },
   400: {
      description: 'Invalid request.',
      content: {
         'application/json': { schema: validationErrorResponseSchema },
      },
   },
   401: { description: 'Authentication required.' },
   403: {
      description: 'Permission or event scope denied.',
      content: { 'application/json': { schema: errorResponseSchema } },
   },
   404: {
      description: 'Resource not found.',
      content: { 'application/json': { schema: errorResponseSchema } },
   },
   409: {
      description: 'Lifecycle or revision conflict.',
      content: { 'application/json': { schema: errorResponseSchema } },
   },
});

export const registerEventTicketDocs = (registry: OpenAPIRegistry) => {
   registry.registerPath({
      method: 'get',
      path: '/api/v1/me/event-tickets',
      operationId: 'listMyEventTicketsV1',
      tags: ['Event tickets'],
      security: [protectedEndpoint],
      responses: responses(success(z.array(ticket))),
   });
   for (const suffix of ['', '/credential'] as const)
      registry.registerPath({
         method: 'get',
         path: `/api/v1/me/event-tickets/{ticketId}${suffix}`,
         operationId: suffix
            ? 'getMyEventTicketCredentialV1'
            : 'getMyEventTicketV1',
         tags: ['Event tickets'],
         security: [protectedEndpoint],
         request: { params: z.object({ ticketId: z.string() }) },
         responses: responses(
            success(suffix ? z.object({ credential: z.string() }) : ticket),
         ),
      });
   registry.registerPath({
      method: 'get',
      path: '/api/v1/me/event-tickets/{ticketId}/qr.png',
      operationId: 'getMyEventTicketQrV1',
      tags: ['Event tickets'],
      security: [protectedEndpoint],
      request: { params: z.object({ ticketId: z.string() }) },
      responses: {
         200: {
            description: 'PNG QR image.',
            content: { 'image/png': { schema: z.string() } },
         },
         401: { description: 'Authentication required.' },
         404: { description: 'Ticket not found.' },
      },
   });
   const commands = [
      {
         path: 'resolve',
         operationId: 'resolveEventTicketV1',
         body: scanTicketSchema,
         output: resolved,
      },
      {
         path: 'check-in',
         operationId: 'checkInEventTicketCredentialV1',
         body: scanTicketSchema,
         output: checkIn,
      },
      {
         path: 'manual-check-in',
         operationId: 'checkInEventTicketManuallyV1',
         body: manualCheckInSchema,
         output: checkIn,
      },
   ] as const;
   for (const command of commands)
      registry.registerPath({
         method: 'post',
         path: `/api/v1/internal/sub-events/{subEventId}/tickets/${command.path}`,
         operationId: command.operationId,
         tags: ['Event attendance'],
         security: [protectedEndpoint],
         request: {
            params,
            body: {
               required: true,
               content: { 'application/json': { schema: command.body } },
            },
         },
         responses: responses(success(command.output)),
      });
   registry.registerPath({
      method: 'get',
      path: '/api/v1/internal/sub-events/{subEventId}/tickets/search',
      operationId: 'searchEventTicketsV1',
      tags: ['Event attendance'],
      security: [protectedEndpoint],
      request: { params, query: searchTicketSchema },
      responses: responses(
         z.object({
            msg: z.literal('success'),
            data: z.array(
               resolved.extend({
                  attendance: attendance
                     .extend({ state: z.enum(['CHECKED_IN', 'CHECKED_OUT']) })
                     .nullable(),
               }),
            ),
            meta,
         }),
      ),
   });
   registry.registerPath({
      method: 'get',
      path: '/api/v1/internal/sub-events/{subEventId}/attendance',
      operationId: 'listEventAttendanceV1',
      tags: ['Event attendance'],
      security: [protectedEndpoint],
      request: { params, query: attendanceListSchema },
      responses: responses(
         z.object({
            msg: z.literal('success'),
            data: z.array(attendance.passthrough()),
            counts: z.object({
               currentlyCheckedIn: z.number().int(),
               checkedOut: z.number().int(),
               voided: z.number().int(),
               totalRecords: z.number().int(),
            }),
            meta,
         }),
      ),
   });
   for (const action of ['checkout', 'void'] as const)
      registry.registerPath({
         method: 'post',
         path: `/api/v1/internal/sub-events/{subEventId}/attendance/{attendanceId}/${action}`,
         operationId:
            action === 'checkout'
               ? 'checkoutEventAttendanceV1'
               : 'voidEventAttendanceV1',
         tags: ['Event attendance'],
         security: [protectedEndpoint],
         request: {
            params: z.object({
               subEventId: z.string(),
               attendanceId: z.string(),
            }),
            body: {
               required: true,
               content: {
                  'application/json': { schema: attendanceMutationSchema },
               },
            },
         },
         responses: responses(
            success(z.object({ record: attendance, replay: z.boolean() })),
         ),
      });
};
