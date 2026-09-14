import '@/docs/zodOpenApi.js';
import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import {
   AttendanceCheckoutSchema,
   AttendanceVoidSchema,
   TicketCredentialSchema,
   TicketManualCheckInSchema,
   TicketSearchSchema,
} from './eventTicketSchema.js';

const date = z.string().datetime().nullable();
const attendance = z.object({
   id: z.string(),
   checkedInAt: z.string().datetime(),
   checkedOutAt: date,
   revision: z.number().int().positive(),
});
const ticket = z.object({
   id: z.string(),
   eventId: z.string(),
   status: z.enum(['ACTIVE', 'USED', 'REVOKED', 'EXPIRED']),
   issuedAt: z.string().datetime(),
   expiresAt: date,
   event: z.object({
      name: z.string(),
      startsAt: date,
      endsAt: date,
      attendanceEnabled: z.boolean(),
      attendanceCheckoutEnabled: z.boolean(),
   }),
   attendance: attendance.nullable(),
});
const rosterTicket = z.object({
   id: z.string(),
   status: z.enum(['ACTIVE', 'USED', 'REVOKED', 'EXPIRED']),
   issuedAt: z.string().datetime(),
   name: z.string().nullable(),
   email: z.string().nullable(),
   nim: z.string().nullable(),
   orderNumber: z.string(),
   attendance: attendance.nullable(),
});
const security = [{ sessionCookie: [] }];
const params = z.object({ eventId: z.string() });
const errors = {
   400: { description: 'Invalid request.' },
   401: { description: 'Authentication required.' },
   403: { description: 'Permission and Event scope required.' },
   404: { description: 'Ticket or attendance record not found.' },
   409: { description: 'Attendance disabled, duplicate, or state conflict.' },
};

export const registerEventTicketDocs = (registry: OpenAPIRegistry) => {
   const Ticket = registry.register('ParticipantEventTicket', ticket);
   const Attendance = registry.register('EventAttendance', attendance);
   registry.registerPath({
      method: 'get',
      path: '/api/me/event-tickets',
      tags: ['Event Tickets'],
      operationId: 'listMyEventTickets',
      security,
      responses: {
         200: {
            description: 'Owned confirmed tickets.',
            content: {
               'application/json': {
                  schema: z.object({ data: z.array(Ticket) }),
               },
            },
         },
         401: errors[401],
      },
   });
   registry.registerPath({
      method: 'get',
      path: '/api/me/event-tickets/{ticketId}',
      tags: ['Event Tickets'],
      operationId: 'getMyEventTicket',
      security,
      request: { params: z.object({ ticketId: z.string() }) },
      responses: {
         200: {
            description: 'Owned ticket.',
            content: {
               'application/json': { schema: z.object({ data: Ticket }) },
            },
         },
         401: errors[401],
         404: errors[404],
      },
   });
   registry.registerPath({
      method: 'get',
      path: '/api/me/event-tickets/{ticketId}/credential',
      tags: ['Event Tickets'],
      operationId: 'getMyEventTicketCredential',
      security,
      description:
         'Returns the active owner-only credential in the response body. Credentials are never placed in URLs, logs, lists, or examples.',
      request: { params: z.object({ ticketId: z.string() }) },
      responses: {
         200: {
            description: 'Active credential.',
            content: {
               'application/json': {
                  schema: z.object({
                     data: z.object({
                        credential: z.string(),
                        qrPayload: z.string(),
                     }),
                  }),
               },
            },
         },
         401: errors[401],
         404: errors[404],
      },
   });
   registry.registerPath({
      method: 'get',
      path: '/api/internal/events/{eventId}/tickets/search',
      tags: ['Event Attendance'],
      operationId: 'searchEventTickets',
      security,
      request: { params, query: TicketSearchSchema },
      responses: {
         200: {
            description: 'Confirmed participant roster and attendance state.',
            content: {
               'application/json': {
                  schema: z.object({
                     data: z.array(rosterTicket),
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
         ...errors,
      },
   });
   registry.registerPath({
      method: 'get',
      path: '/api/internal/events/{eventId}/attendance',
      tags: ['Event Attendance'],
      operationId: 'listEventAttendance',
      security,
      request: { params, query: TicketSearchSchema },
      responses: {
         200: {
            description: 'Confirmed participant roster and attendance state.',
            content: {
               'application/json': {
                  schema: z.object({
                     data: z.array(rosterTicket),
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
         ...errors,
      },
   });
   registry.registerPath({
      method: 'post',
      path: '/api/internal/events/{eventId}/tickets/check-in',
      tags: ['Event Attendance'],
      operationId: 'checkInEventTicket',
      security,
      request: {
         params,
         body: {
            required: true,
            content: { 'application/json': { schema: TicketCredentialSchema } },
         },
      },
      responses: {
         201: {
            description: 'Participant checked in.',
            content: {
               'application/json': { schema: z.object({ data: Attendance }) },
            },
         },
         ...errors,
      },
   });
   registry.registerPath({
      method: 'post',
      path: '/api/internal/events/{eventId}/tickets/manual-check-in',
      tags: ['Event Attendance'],
      operationId: 'manuallyCheckInEventTicket',
      security,
      description:
         'Checks in a selected confirmed participant by opaque ticket ID; no credential is exposed.',
      request: {
         params,
         body: {
            required: true,
            content: {
               'application/json': { schema: TicketManualCheckInSchema },
            },
         },
      },
      responses: {
         201: {
            description: 'Participant checked in.',
            content: {
               'application/json': { schema: z.object({ data: Attendance }) },
            },
         },
         ...errors,
      },
   });
   registry.registerPath({
      method: 'post',
      path: '/api/internal/events/{eventId}/attendance/{attendanceId}/checkout',
      tags: ['Event Attendance'],
      operationId: 'checkoutEventAttendance',
      security,
      request: {
         params: z.object({ eventId: z.string(), attendanceId: z.string() }),
         body: {
            required: true,
            content: {
               'application/json': { schema: AttendanceCheckoutSchema },
            },
         },
      },
      responses: {
         200: {
            description: 'Participant checked out.',
            content: {
               'application/json': { schema: z.object({ data: Attendance }) },
            },
         },
         ...errors,
      },
   });
   registry.registerPath({
      method: 'post',
      path: '/api/internal/events/{eventId}/attendance/{attendanceId}/void',
      tags: ['Event Attendance'],
      operationId: 'voidEventAttendance',
      security,
      description:
         'Voids an erroneous check-in without deleting its attendance or audit history.',
      request: {
         params: z.object({ eventId: z.string(), attendanceId: z.string() }),
         body: {
            required: true,
            content: {
               'application/json': { schema: AttendanceVoidSchema },
            },
         },
      },
      responses: {
         200: {
            description: 'Attendance check-in voided.',
            content: {
               'application/json': { schema: z.object({ data: Attendance }) },
            },
         },
         ...errors,
      },
   });
};
