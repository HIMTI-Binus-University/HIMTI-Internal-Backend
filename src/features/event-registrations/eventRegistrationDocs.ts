import '@/docs/zodOpenApi.js';
import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import {
   CancelEventRegistrationSchema,
   BundleRevisionSchema,
   CreateEventBundleSchema,
   CreateEventRegistrationSchema,
   EventRegistrationListSchema,
   InternalEventRegistrationListSchema,
   JoinEventBundleSchema,
   RemoveBundleMemberSchema,
   ReplaceRegistrationAnswersSchema,
} from './eventRegistrationSchema.js';

const status = z.enum([
   'ASSEMBLING',
   'PENDING_PAYMENT',
   'PAYMENT_REVIEW',
   'CONFIRMED',
   'EXPIRED',
   'CANCELLED',
   'REJECTED',
]);
const date = z.string().datetime().nullable();
const money = z.string().regex(/^\d+$/);
const question = z.object({
   logicalId: z.string(),
   id: z.string(),
   fieldKey: z.string(),
   label: z.string(),
   type: z.enum([
      'TEXT',
      'TEXTAREA',
      'NUMBER',
      'DATE',
      'SELECT',
      'RADIO',
      'CHECKBOX',
      'FILE',
   ]),
   isRequired: z.boolean(),
   orderIndex: z.number().int(),
   validation: z.unknown(),
   options: z.array(
      z.object({
         id: z.string(),
         label: z.string(),
         value: z.string(),
         orderIndex: z.number().int(),
      }),
   ),
});
const form = z.object({
   revision: z.number().int(),
   id: z.string(),
   eventId: z.string(),
   name: z.string(),
   description: z.string().nullable(),
   status: z.enum(['DRAFT', 'PUBLISHED', 'CLOSED']),
   version: z.number().int(),
   publishedAt: date,
   createdAt: z.string().datetime(),
   updatedAt: date,
   sections: z.array(
      z.object({
         id: z.string(),
         registrationFormId: z.string(),
         title: z.string(),
         description: z.string().nullable(),
         orderIndex: z.number().int(),
         questions: z.array(question),
      }),
   ),
});
const profile = z.object({
   readOnly: z.literal(true),
   complete: z.boolean(),
   missingFields: z.array(z.string()),
   values: z.object({
      name: z.string().nullable(),
      nim: z.string().nullable(),
      outlookEmail: z.string().nullable(),
      email: z.string().nullable(),
      university: z.string().nullable(),
      studyProgram: z.string().nullable(),
      region: z.string().nullable(),
      phoneNumber: z.string().nullable(),
   }),
});
const packageSchema = z.object({
   id: z.string(),
   code: z.string(),
   name: z.string(),
   description: z.string().nullable(),
   seatCount: z.number().int().positive(),
   currency: z.string().length(3),
   priceMinor: money,
   salesStartAt: date,
   salesEndAt: date,
});
const storedAnswer = z.object({
   formQuestionId: z.string(),
   textValue: z.string().nullable(),
   numberValue: z.string().nullable(),
   dateValue: date,
   selectedOptions: z.array(
      z.object({
         option: z.object({ label: z.string().optional(), value: z.string() }),
      }),
   ),
});
const member = z.object({
   name: z.string().nullable(),
   isCurrentUser: z.boolean(),
   ready: z.boolean(),
   supplementalRevision: z.number().int().optional(),
   supplementalRequests: z
      .array(
         z.object({
            id: z.string(),
            orderMemberId: z.string(),
            logicalId: z.string(),
            questionId: z.string(),
            answer: z
               .union([z.string(), z.number(), z.array(z.string())])
               .nullable(),
            answeredAt: date,
            withdrawnAt: date,
            createdAt: z.string().datetime(),
            question,
         }),
      )
      .optional(),
   id: z.string(),
   status: z.enum(['ACTIVE', 'LEFT', 'REMOVED', 'LOCKED']),
   position: z.number().int(),
   snapshotName: z.string().nullable(),
   snapshotNim: z.string().nullable(),
   snapshotOutlookEmail: z.string().nullable(),
   snapshotEmail: z.string().nullable(),
   snapshotUniversity: z.string().nullable(),
   snapshotStudyProgram: z.string().nullable(),
   snapshotRegion: z.string().nullable(),
   snapshotPhoneNumber: z.string().nullable(),
   snapshotAt: date,
   submissions: z
      .array(
         z.object({
            id: z.string(),
            registrationFormId: z.string(),
            formVersion: z.number().int(),
            status: z.enum(['DRAFT', 'SUBMITTED', 'LOCKED']),
            submittedAt: date,
            form,
            answers: z.array(storedAnswer),
         }),
      )
      .optional(),
   ticket: z
      .object({
         id: z.string(),
         status: z.enum(['ACTIVE', 'USED', 'REVOKED', 'EXPIRED']),
         issuedAt: z.string().datetime(),
         expiresAt: date,
      })
      .nullable()
      .optional(),
});
const registration = z
   .object({
      id: z.string(),
      orderNumber: z.string(),
      eventId: z.string(),
      ticketPackageId: z.string(),
      status,
      revision: z.number().int(),
      seatCount: z.number().int().positive(),
      currency: z.string().length(3),
      subtotalMinor: money,
      totalMinor: money,
      bundleCode: z
         .string()
         .nullable()
         .optional()
         .describe(
            'Current readable code for Bundle orders only. Null means a legacy Bundle requires one regeneration. Omitted for individual orders.',
         ),
      paymentDeadlineAt: date,
      confirmedAt: date,
      cancelledAt: date,
      createdAt: z.string().datetime(),
      updatedAt: date,
      event: z.object({
         id: z.string(),
         name: z.string(),
         startsAt: date,
         endsAt: date,
         cancellationClosesAt: date,
      }),
      ticketPackage: z.object({
         id: z.string(),
         code: z.string(),
         name: z.string(),
         seatCount: z.number().int().positive(),
      }),
      members: z.array(member),
      capacityHold: z.unknown().nullable(),
      payment: z.unknown().nullable(),
      profile: profile.optional(),
   })
   .describe(
      'Participant order detail. Ticket token and token hash are never returned.',
   );
const internalMember = z.object({
   id: z.string(),
   userId: z.string(),
   status: z.enum(['ACTIVE', 'LEFT', 'REMOVED', 'LOCKED']),
   position: z.number().int(),
   name: z.string().nullable(),
   email: z.string().nullable(),
   supplementalRevision: z.number().int(),
   additionalAnswersReady: z.boolean(),
   snapshotName: z.string().nullable(),
   snapshotNim: z.string().nullable(),
   snapshotOutlookEmail: z.string().nullable(),
   snapshotEmail: z.string().nullable(),
   snapshotUniversity: z.string().nullable(),
   snapshotStudyProgram: z.string().nullable(),
   snapshotRegion: z.string().nullable(),
   snapshotPhoneNumber: z.string().nullable(),
   snapshotAt: date,
   supplementalRequests: z.array(
      z.object({
         id: z.string(),
         answer: z.unknown().nullable(),
         answeredAt: date,
         withdrawnAt: date,
         question: question.omit({ validation: true }),
      }),
   ),
   submissions: z.array(
      z.object({
         id: z.string(),
         registrationFormId: z.string(),
         formVersion: z.number().int(),
         status: z.enum(['DRAFT', 'SUBMITTED', 'LOCKED']),
         submittedAt: date,
         form,
         answers: z.array(storedAnswer),
      }),
   ),
   ticket: z
      .object({
         id: z.string(),
         status: z.enum(['ACTIVE', 'USED', 'REVOKED', 'EXPIRED']),
         issuedAt: z.string().datetime(),
         expiresAt: date,
      })
      .nullable(),
});
const internalRegistration = z.object({
   id: z.string(),
   orderNumber: z.string(),
   eventId: z.string(),
   ticketPackageId: z.string(),
   kind: z.enum(['INDIVIDUAL', 'BUNDLE']),
   status,
   revision: z.number().int(),
   seatCount: z.number().int().positive(),
   currency: z.string().length(3),
   subtotalMinor: money,
   totalMinor: money,
   paymentDeadlineAt: date,
   confirmedAt: date,
   cancelledAt: date,
   createdAt: z.string().datetime(),
   updatedAt: date,
   event: z.object({
      id: z.string(),
      name: z.string(),
      startsAt: date,
      endsAt: date,
      cancellationClosesAt: date,
   }),
   ticketPackage: z.object({
      id: z.string(),
      code: z.string(),
      name: z.string(),
      seatCount: z.number().int().positive(),
   }),
   members: z.array(internalMember),
   capacityHold: z
      .object({
         status: z.enum(['ACTIVE', 'CONSUMED', 'RELEASED', 'EXPIRED']),
         quantity: z.number().int(),
         expiresAt: z.string().datetime(),
      })
      .nullable(),
});
const internalRegistrationSummary = z.object({
   id: z.string(),
   orderNumber: z.string(),
   kind: z.enum(['INDIVIDUAL', 'BUNDLE']),
   status,
   revision: z.number().int(),
   seatCount: z.number().int().positive(),
   memberCount: z.number().int().nonnegative(),
   currency: z.string().length(3),
   totalMinor: money,
   paymentDeadlineAt: date,
   confirmedAt: date,
   createdAt: z.string().datetime(),
   ticketPackage: z.object({ id: z.string(), name: z.string() }),
});
const itemResponse = z.object({ data: registration });
const json = (schema: z.ZodType) => ({ 'application/json': { schema } });
const security = [{ sessionCookie: [] }];
const errors = {
   400: { description: 'Request or typed answers are invalid.' },
   401: { description: 'Authentication required.' },
   404: { description: 'Event, package, or registration not found.' },
   409: {
      description:
         'Registration state, revision, deadline, duplicate, or capacity conflict.',
   },
};

export const registerEventRegistrationDocs = (registry: OpenAPIRegistry) => {
   const Context = registry.register(
      'EventRegistrationContextResponse',
      z.object({
         data: z.object({
            event: z.object({
               id: z.string(),
               name: z.string(),
               capacity: z.number().int().nullable(),
               currency: z.string().length(3),
               registrationOpen: z.boolean(),
               registrationOpensAt: date,
               registrationClosesAt: date,
            }),
            packages: z.array(packageSchema),
            form: form.nullable(),
         }),
      }),
   );
   const Registration = registry.register(
      'EventRegistrationResponse',
      itemResponse,
   );
   const params = z.object({ registrationId: z.string() });
   const bundleResult = z.object({
      data: z.object({ registration, bundleCode: z.string() }),
   });
   const registrationSummary = z.object({
      id: z.string(),
      eventId: z.string(),
      status,
   });
   registry.registerPath({
      method: 'get',
      path: '/api/internal/events/{eventId}/registrations',
      operationId: 'listInternalEventRegistrations',
      tags: ['Event Registrations'],
      security,
      description:
         'Lists individual and Bundle orders. Requires review_event_registrations and event scope. Payment data is excluded.',
      request: {
         params: z.object({ eventId: z.string() }),
         query: InternalEventRegistrationListSchema,
      },
      responses: {
         200: {
            description: 'Scoped registration orders.',
            content: json(
               z.object({
                  data: z.array(internalRegistrationSummary),
                  meta: z.object({
                     page: z.number(),
                     limit: z.number(),
                     totalRecords: z.number(),
                     totalPages: z.number(),
                  }),
               }),
            ),
         },
         ...errors,
         403: { description: 'Permission and event scope required.' },
      },
   });
   registry.registerPath({
      method: 'get',
      path: '/api/internal/events/{eventId}/registrations/{registrationId}',
      operationId: 'getInternalEventRegistration',
      tags: ['Event Registrations'],
      security,
      description:
         'Returns profile snapshots and pinned form answers for a scoped registration reviewer. Payment and private upload data are excluded.',
      request: {
         params: z.object({ eventId: z.string(), registrationId: z.string() }),
      },
      responses: {
         200: {
            description: 'Scoped registration detail.',
            content: json(z.object({ data: internalRegistration })),
         },
         ...errors,
         403: { description: 'Permission and event scope required.' },
      },
   });
   registry.registerPath({
      method: 'put',
      path: '/api/me/event-registrations/{registrationId}/additional-answers',
      operationId: 'saveSupplementalAnswers',
      tags: ['Event Registrations'],
      security,
      description:
         'Answers outstanding additional questions only. expectedRevision is the member supplementalRevision. Does not change registration, payment, ticket or capacity state. Answered questions are historical and immutable.',
      request: {
         params,
         body: {
            required: true,
            content: json(ReplaceRegistrationAnswersSchema),
         },
      },
      responses: {
         200: {
            description: 'Additional answers saved.',
            content: json(Registration),
         },
         ...errors,
      },
   });
   registry.registerPath({
      method: 'post',
      path: '/api/events/{eventId}/bundles',
      operationId: 'createEventBundle',
      tags: ['Event Registrations'],
      security,
      request: {
         params: z.object({ eventId: z.string() }),
         headers: z.object({ 'idempotency-key': z.string().uuid() }),
         body: { required: true, content: json(CreateEventBundleSchema) },
      },
      responses: {
         201: {
            description:
               'Assembling Bundle created. The readable code is also available on authenticated participant detail.',
            content: json(bundleResult),
         },
         ...errors,
         503: { description: 'Bundle Code cryptography is not configured.' },
      },
   });
   registry.registerPath({
      method: 'post',
      path: '/api/events/{eventId}/bundles/join',
      operationId: 'joinEventBundle',
      tags: ['Event Registrations'],
      security,
      request: {
         params: z.object({ eventId: z.string() }),
         body: { required: true, content: json(JoinEventBundleSchema) },
      },
      responses: {
         201: { description: 'Joined Bundle.', content: json(Registration) },
         ...errors,
         429: { description: 'Too many Bundle Code attempts.' },
      },
   });
   registry.registerPath({
      method: 'post',
      path: '/api/me/event-registrations/{registrationId}/bundle-code/replace',
      operationId: 'replaceMyBundleCode',
      tags: ['Event Registrations'],
      security,
      request: {
         params,
         body: { required: true, content: json(BundleRevisionSchema) },
      },
      responses: {
         200: { description: 'Code replaced.', content: json(bundleResult) },
         ...errors,
      },
   });
   registry.registerPath({
      method: 'post',
      path: '/api/me/event-registrations/{registrationId}/leave',
      operationId: 'leaveMyBundle',
      tags: ['Event Registrations'],
      security,
      request: {
         params,
         body: { required: true, content: json(BundleRevisionSchema) },
      },
      responses: {
         200: {
            description: 'Membership left.',
            content: json(
               z.object({ data: z.object({ left: z.literal(true) }) }),
            ),
         },
         ...errors,
      },
   });
   registry.registerPath({
      method: 'get',
      path: '/api/internal/events/{eventId}/registrations/bundles',
      operationId: 'listInternalEventBundles',
      tags: ['Event Registrations'],
      security,
      request: {
         params: z.object({ eventId: z.string() }),
         query: EventRegistrationListSchema,
      },
      responses: {
         200: {
            description:
               'Bundle operations list. Readable codes are never exposed.',
            content: json(z.object({ data: z.array(z.unknown()) })),
         },
         ...errors,
         403: { description: 'Permission and Event scope required.' },
      },
   });
   registry.registerPath({
      method: 'delete',
      path: '/api/internal/events/{eventId}/registrations/{registrationId}/members/{userId}',
      operationId: 'removeEventBundleMember',
      tags: ['Event Registrations'],
      security,
      request: {
         params: z.object({
            eventId: z.string(),
            registrationId: z.string(),
            userId: z.string(),
         }),
         body: { required: true, content: json(RemoveBundleMemberSchema) },
      },
      responses: {
         200: {
            description: 'Member removed and audited.',
            content: json(
               z.object({ data: z.object({ removed: z.literal(true) }) }),
            ),
         },
         ...errors,
         403: { description: 'Permission and Event scope required.' },
      },
   });
   registry.registerPath({
      method: 'get',
      path: '/api/internal/events/{eventId}/registrations/outstanding-answers',
      operationId: 'supplementalTracking',
      tags: ['Event Registrations'],
      security,
      description:
         'Requires manage_event_registration_form and event scope. Active participants owing required additional answers. Manual communication only.',
      request: {
         params: z.object({ eventId: z.string() }),
         query: EventRegistrationListSchema,
      },
      responses: {
         200: {
            description: 'Outstanding required answers.',
            content: json(
               z.object({
                  data: z.array(
                     z.object({
                        id: z.string(),
                        registrationOrderId: z.string(),
                        user: z.object({ name: z.string(), email: z.string() }),
                        supplementalRequests: z.array(
                           z.object({
                              id: z.string(),
                              question: z.object({ label: z.string() }),
                           }),
                        ),
                     }),
                  ),
               }),
            ),
         },
         ...errors,
         403: { description: 'Permission and event scope required.' },
      },
   });
   registry.registerPath({
      method: 'get',
      path: '/api/events/{eventId}/registration-context',
      operationId: 'getEventRegistrationContext',
      tags: ['Event Registrations'],
      request: { params: z.object({ eventId: z.string() }) },
      responses: {
         200: {
            description: 'Public registration context.',
            content: json(Context),
         },
         404: errors[404],
      },
   });
   registry.registerPath({
      method: 'post',
      path: '/api/events/{eventId}/registrations',
      operationId: 'createEventRegistration',
      tags: ['Event Registrations'],
      security,
      request: {
         params: z.object({ eventId: z.string() }),
         body: { required: true, content: json(CreateEventRegistrationSchema) },
      },
      responses: {
         201: {
            description: 'Individual registration created.',
            content: json(Registration),
         },
         ...errors,
      },
   });
   registry.registerPath({
      method: 'get',
      path: '/api/me/event-registrations',
      operationId: 'listMyEventRegistrations',
      tags: ['Event Registrations'],
      security,
      request: { query: EventRegistrationListSchema },
      responses: {
         200: {
            description: 'Current user registrations.',
            content: json(
               z.object({
                  data: z.array(registrationSummary),
                  meta: z.object({
                     page: z.number(),
                     limit: z.number(),
                     totalRecords: z.number(),
                     totalPages: z.number(),
                  }),
               }),
            ),
         },
         401: errors[401],
      },
   });
   registry.registerPath({
      method: 'get',
      path: '/api/me/event-registrations/{registrationId}',
      operationId: 'getMyEventRegistration',
      tags: ['Event Registrations'],
      security,
      request: { params },
      responses: {
         200: {
            description: 'Owned registration detail.',
            content: json(Registration),
         },
         401: errors[401],
         404: errors[404],
      },
   });
   registry.registerPath({
      method: 'put',
      path: '/api/me/event-registrations/{registrationId}/answers',
      operationId: 'replaceMyEventRegistrationAnswers',
      tags: ['Event Registrations'],
      security,
      request: {
         params,
         body: {
            required: true,
            content: json(ReplaceRegistrationAnswersSchema),
         },
      },
      responses: {
         200: { description: 'Answers replaced.', content: json(Registration) },
         ...errors,
      },
   });
   registry.registerPath({
      method: 'post',
      path: '/api/me/event-registrations/{registrationId}/cancel',
      operationId: 'cancelMyEventRegistration',
      tags: ['Event Registrations'],
      security,
      request: {
         params,
         body: { required: true, content: json(CancelEventRegistrationSchema) },
      },
      responses: {
         200: {
            description: 'Registration cancelled.',
            content: json(
               z.object({ data: z.object({ cancelled: z.literal(true) }) }),
            ),
         },
         ...errors,
      },
   });
};
