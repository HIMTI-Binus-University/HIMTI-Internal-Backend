import '@/docs/zodOpenApi.js';
import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import {
   errorResponseSchema,
   formFieldTypeSchema,
   formQuestionStatusSchema,
   protectedEndpoint,
   registrationFormStatusSchema,
   subeventStatusSchema,
   subeventTypeSchema,
   subeventVisibilitySchema,
   validationErrorResponseSchema,
} from '@/docs/commonSchemas.js';

const tag = 'Sub-events';

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
   locationUrl: z.string().url().optional(),
   price: z.number().int().min(0).optional(),
   paid: z.boolean().optional(),
   paymentAccountBank: z.string().optional(),
   paymentAccountNumber: z.number().int().optional(),
   paymentAccountName: z.string().optional(),
   priceModifier: z.number().int().optional(),
   paymentDesc: z.string().optional(),
   maxParticipants: z.number().int().optional(),
   maxTicketsPerUser: z.number().int().optional(),
   questions: z.array(formQuestionRequestSchema).optional(),
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

   registry.registerPath({
      method: 'post',
      path: '/api/sub-event/create-sub-event',
      tags: [tag],
      summary: 'Create a sub-event',
      description:
         'Requires authentication. If questions are provided, a draft registration form is created with generated field keys.',
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
};
