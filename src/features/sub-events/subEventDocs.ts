import '@/docs/zodOpenApi.js';
import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import {
   errorResponseSchema,
   formFieldTypeSchema,
   formQuestionStatusSchema,
   idParamSchema,
   paginationMetaSchema,
   protectedEndpoint,
   registrationFormStatusSchema,
   subeventStatusSchema,
   subeventTypeSchema,
   subeventVisibilitySchema,
   validationErrorResponseSchema,
} from '@/docs/commonSchemas.js';

const tag = 'Sub-events';

const registrationStatusSchema = z.enum([
   'PENDING',
   'APPROVED',
   'REJECTED',
   'CANCELLED',
]);
const paymentStatusSchema = z.enum([
   'UNPAID',
   'SUBMITTED',
   'VERIFIED',
   'REJECTED',
]);
const registrationResponseStatusSchema = z.enum([
   'DRAFT',
   'SUBMITTED',
   'LOCKED',
]);

const getSubEventQuerySchema = z.object({
   page: z.coerce.number().min(1).optional(),
   limit: z.coerce.number().min(1).max(100).optional(),
   search: z.string().optional(),
   sort: z.string().optional(),
   status: subeventStatusSchema.optional(),
   visibility: subeventVisibilitySchema.optional(),
   eventId: z.string().optional(),
});

const questionOptionRequestSchema = z.object({
   label: z.string().min(1),
   value: z.string().min(1),
});

const formQuestionRequestSchema = z.object({
   label: z.string().min(1),
   fieldType: formFieldTypeSchema,
   isRequired: z.boolean().optional(),
   helpText: z.string().optional(),
   options: z.array(questionOptionRequestSchema).optional(),
});

const createSubEventRequestSchema = z.object({
   eventId: z.string(),
   name: z.string().min(1),
   publicDescription: z.string().optional(),
   privateDescription: z.string().optional(),
   date: z.string().datetime(),
   type: subeventTypeSchema,
   locationName: z.string().optional(),
   locationUrl: z.string().nullable().optional(),
   posterUrl: z.string().nullable().optional(),
   destinationUrl: z.string().nullable().optional(),
   price: z.number().int().min(0).optional(),
   paid: z.boolean().optional(),
   paymentAccountBank: z.string().optional(),
   paymentAccountNumber: z.number().int().optional(),
   paymentAccountName: z.string().optional(),
   priceModifier: z.number().int().optional(),
   paymentDesc: z.string().optional(),
   maxParticipants: z.number().int().optional(),
   maxTicketsPerUser: z.number().int().optional(),
   visibility: subeventVisibilitySchema.optional(),
   questions: z.array(formQuestionRequestSchema).optional(),
});

const updateSubEventRequestSchema = z.object({
   name: z.string().min(1).optional(),
   publicDescription: z.string().nullable().optional(),
   privateDescription: z.string().nullable().optional(),
   date: z.string().datetime().optional(),
   type: subeventTypeSchema.optional(),
   locationName: z.string().nullable().optional(),
   locationUrl: z.string().nullable().optional(),
   posterUrl: z.string().nullable().optional(),
   destinationUrl: z.string().nullable().optional(),
   price: z.number().int().min(0).optional(),
   paid: z.boolean().optional(),
   paymentAccountBank: z.string().optional(),
   paymentAccountNumber: z.number().int().nullable().optional(),
   paymentAccountName: z.string().nullable().optional(),
   priceModifier: z.number().int().nullable().optional(),
   paymentDesc: z.string().optional(),
   maxParticipants: z.number().int().nullable().optional(),
   maxTicketsPerUser: z.number().int().nullable().optional(),
   isRegistrationOpen: z.boolean().optional(),
   autoAcceptRegistration: z.boolean().optional(),
   visibility: subeventVisibilitySchema.optional(),
   status: subeventStatusSchema.optional(),
});

const formQuestionOptionSchema = z.object({
   id: z.string(),
   formQuestionId: z.string(),
   label: z.string(),
   value: z.string(),
   isActive: z.boolean(),
   createdAt: z.string().datetime(),
   createdBy: z.string(),
   updatedAt: z.string().datetime().nullable(),
   updatedBy: z.string().nullable(),
});

const formQuestionSchema = z.object({
   id: z.string(),
   registrationFormId: z.string(),
   label: z.string(),
   fieldKey: z.string(),
   fieldType: formFieldTypeSchema,
   isRequired: z.boolean(),
   helpText: z.string().nullable(),
   orderIndex: z.number(),
   status: formQuestionStatusSchema,
   createdAt: z.string().datetime(),
   createdBy: z.string(),
   updatedAt: z.string().datetime().nullable(),
   updatedBy: z.string().nullable(),
   options: z.array(formQuestionOptionSchema),
});

const registrationFormSchema = z.object({
   id: z.string(),
   subEventId: z.string(),
   status: registrationFormStatusSchema,
   createdAt: z.string().datetime(),
   createdBy: z.string(),
   updatedAt: z.string().datetime().nullable(),
   updatedBy: z.string().nullable(),
   questions: z.array(formQuestionSchema),
});

const subEventSchema = z.object({
   id: z.string(),
   eventId: z.string(),
   name: z.string(),
   publicDescription: z.string().nullable(),
   privateDescription: z.string().nullable(),
   date: z.string().datetime(),
   type: subeventTypeSchema,
   locationName: z.string().nullable(),
   locationUrl: z.string().nullable(),
   posterUrl: z.string().nullable(),
   destinationUrl: z.string().nullable(),
   position: z.number().int().nonnegative(),
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
   checkOutToken: z.string().nullable(),
   visibility: subeventVisibilitySchema,
   status: subeventStatusSchema,
   createdAt: z.string().datetime(),
   createdBy: z.string(),
   updatedAt: z.string().datetime().nullable(),
   updatedBy: z.string().nullable(),
   registrationForms: z.array(registrationFormSchema),
});

const registrationFormListItemSchema = z.object({
   id: z.string(),
   status: registrationFormStatusSchema,
   questionCount: z.number(),
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
   posterUrl: z.string().nullable(),
   destinationUrl: z.string().nullable(),
   position: z.number().int().nonnegative(),
   price: z.number(),
   paid: z.boolean(),
   visibility: subeventVisibilitySchema,
   status: subeventStatusSchema,
   isRegistrationOpen: z.boolean(),
   autoAcceptRegistration: z.boolean(),
   maxParticipants: z.number().nullable(),
   maxTicketsPerUser: z.number().nullable(),
   registrationForms: z.array(registrationFormListItemSchema),
   participantCount: z.number(),
   submittedResponseCount: z.number(),
});

const formAnswerSchema = z.object({
   id: z.string(),
   registrationResponseId: z.string(),
   formQuestionId: z.string(),
   value: z.string().nullable(),
   selectedOptionValue: z.string().nullable(),
   fileUrl: z.string().nullable(),
   createdAt: z.string().datetime(),
   updatedAt: z.string().datetime().nullable(),
});

const registrationResponseSchema = z.object({
   id: z.string(),
   eventHasParticipantId: z.string(),
   registrationFormId: z.string(),
   userId: z.string(),
   status: registrationResponseStatusSchema,
   submittedAt: z.string().datetime().nullable(),
   createdAt: z.string().datetime(),
   updatedAt: z.string().datetime().nullable(),
   answers: z.array(formAnswerSchema),
});

const participantUserSchema = z.object({
   id: z.string(),
   name: z.string(),
   email: z.string().email(),
   image: z.string().nullable(),
});

const participantSchema = z.object({
   id: z.string(),
   eventId: z.string(),
   eventModeId: z.string(),
   userId: z.string(),
   registrationStatus: registrationStatusSchema,
   approvedAt: z.string().datetime().nullable(),
   approvedBy: z.string().nullable(),
   paymentStatus: paymentStatusSchema,
   paymentProofUrl: z.string().nullable(),
   paymentSubmittedAt: z.string().datetime().nullable(),
   paymentVerifiedAt: z.string().datetime().nullable(),
   paymentVerifiedBy: z.string().nullable(),
   createdAt: z.string().datetime(),
   updatedAt: z.string().datetime().nullable(),
   user: participantUserSchema,
   registrationResponses: z.array(registrationResponseSchema),
});

const subEventDetailSchema = subEventSchema.extend({
   participants: z.array(participantSchema),
});

const subEventListResponseSchema = z.object({
   msg: z.literal('success'),
   data: z.array(subEventListItemSchema),
   meta: paginationMetaSchema,
});

const subEventDetailResponseSchema = z.object({
   msg: z.literal('success'),
   data: subEventDetailSchema,
});

const subEventMutationResponseSchema = z.object({
   msg: z.literal('success'),
   data: subEventSchema,
});

export const registerSubEventDocs = (registry: OpenAPIRegistry) => {
   const CreateSubEventRequest = registry.register(
      'CreateSubEventRequest',
      createSubEventRequestSchema,
   );
   const SubEventMutationResponse = registry.register(
      'SubEventMutationResponse',
      subEventMutationResponseSchema,
   );
   const UpdateSubEventRequest = registry.register(
      'UpdateSubEventRequest',
      updateSubEventRequestSchema,
   );
   const SubEventListResponse = registry.register(
      'SubEventListResponse',
      subEventListResponseSchema,
   );
   const SubEventDetailResponse = registry.register(
      'SubEventDetailResponse',
      subEventDetailResponseSchema,
   );

   registry.registerPath({
      method: 'get',
      path: '/api/sub-event/get-list',
      tags: [tag],
      summary: 'List accessible sub-events',
      description:
         'Requires authentication and manage_events permission. Admin users ' +
         'can list all sub-events; other users only see sub-events under events ' +
         'where they are assigned in EventComittee.',
      security: [protectedEndpoint],
      request: {
         query: getSubEventQuerySchema,
      },
      responses: {
         200: {
            description: 'Accessible sub-event list.',
            content: {
               'application/json': {
                  schema: SubEventListResponse,
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
      path: '/api/sub-event/get-list/{id}',
      tags: [tag],
      summary: 'Get sub-event detail',
      description:
         'Requires authentication, manage_events permission, and either Admin ' +
         'role or parent event committee membership. Includes forms, questions, ' +
         'options, participants, registration responses, and form answers.',
      security: [protectedEndpoint],
      request: {
         params: idParamSchema,
      },
      responses: {
         200: {
            description: 'Sub-event detail.',
            content: {
               'application/json': {
                  schema: SubEventDetailResponse,
               },
            },
         },
         401: { description: 'Authentication required.' },
         403: {
            description:
               'Missing manage_events permission, Admin role, or parent event committee membership.',
         },
         404: {
            description: 'Sub-event not found.',
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
      path: '/api/sub-event/create-sub-event',
      tags: [tag],
      summary: 'Create a sub-event',
      description:
         'Requires authentication, manage_events permission, and event ' +
         'committee membership. If questions are provided, a draft ' +
         'registration form is created with generated field keys.',
      security: [protectedEndpoint],
      request: {
         body: {
            required: true,
            content: {
               'application/json': {
                  schema: CreateSubEventRequest,
               },
            },
         },
      },
      responses: {
         200: {
            description: 'Sub-event created.',
            content: {
               'application/json': {
                  schema: SubEventMutationResponse,
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
      path: '/api/sub-event/update-sub-event/{id}',
      tags: [tag],
      summary: 'Update a sub-event',
      description:
         'Requires authentication, manage_events permission, and either Admin ' +
         'role or steering committee membership on the parent event. If status ' +
         'is CANCELLED, the sub-event cancellation flow is applied.',
      security: [protectedEndpoint],
      request: {
         params: idParamSchema,
         body: {
            required: true,
            content: {
               'application/json': {
                  schema: UpdateSubEventRequest,
               },
            },
         },
      },
      responses: {
         200: {
            description: 'Sub-event updated.',
            content: {
               'application/json': {
                  schema: SubEventMutationResponse,
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
            description: 'Sub-event not found.',
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
      path: '/api/sub-event/delete/{id}',
      tags: [tag],
      summary: 'Cancel a sub-event',
      description:
         'Requires authentication, manage_events permission, and either Admin ' +
         'role or steering committee membership on the parent event. Cancels ' +
         'the sub-event and closes related registration forms.',
      security: [protectedEndpoint],
      request: {
         params: idParamSchema,
      },
      responses: {
         200: {
            description: 'Sub-event cancelled.',
            content: {
               'application/json': {
                  schema: SubEventMutationResponse,
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
            description: 'Sub-event not found.',
            content: {
               'application/json': {
                  schema: errorResponseSchema,
               },
            },
         },
      },
   });
};
