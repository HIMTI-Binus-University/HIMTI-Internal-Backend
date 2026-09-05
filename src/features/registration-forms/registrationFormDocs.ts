import '@/docs/zodOpenApi.js';
import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import { RegistrationFormBodySchema } from './registrationFormSchema.js';

const optionSchema = z.object({
   id: z.string(),
   questionId: z.string(),
   label: z.string(),
   value: z.string(),
   orderIndex: z.number().int(),
});
const questionSchema = z.object({
   id: z.string(),
   sectionId: z.string(),
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
   validation: z.object({}).passthrough(),
   options: z.array(optionSchema),
});
const sectionSchema = z.object({
   id: z.string(),
   registrationFormId: z.string(),
   title: z.string(),
   description: z.string().nullable(),
   orderIndex: z.number().int(),
   questions: z.array(questionSchema),
});
const registrationFormSchema = z.object({
   id: z.string(),
   eventId: z.string(),
   name: z.string(),
   description: z.string().nullable(),
   status: z.enum(['DRAFT', 'PUBLISHED', 'CLOSED']),
   version: z.number().int().positive(),
   publishedAt: z.string().datetime().nullable(),
   createdAt: z.string().datetime(),
   updatedAt: z.string().datetime().nullable(),
   sections: z.array(sectionSchema),
});
const validateResponseSchema = z.object({
   data: z.object({ valid: z.literal(true) }),
});
const previewResponseSchema = z.object({
   data: z.object({
      profileSection: z.object({ readOnly: z.literal(true) }),
      form: registrationFormSchema,
   }),
});
const json = (schema: z.ZodType) => ({
   'application/json': { schema },
});

export const registerRegistrationFormDocs = (registry: OpenAPIRegistry) => {
   const EventRegistrationForm = registry.register(
      'EventRegistrationForm',
      registrationFormSchema,
   );
   const EventRegistrationFormResponse = registry.register(
      'EventRegistrationFormResponse',
      z.object({ data: EventRegistrationForm }),
   );
   const EventRegistrationFormValidateResponse = registry.register(
      'EventRegistrationFormValidateResponse',
      validateResponseSchema,
   );
   const EventRegistrationFormPreviewResponse = registry.register(
      'EventRegistrationFormPreviewResponse',
      previewResponseSchema,
   );
   const security = [{ sessionCookie: [] }];
   const params = z.object({ eventId: z.string() });
   const errors = {
      400: { description: 'Invalid form definition.' },
      401: { description: 'Authentication required.' },
      403: { description: 'Permission and Event scope required.' },
      404: { description: 'Event or registration form not found.' },
      409: { description: 'Invalid registration form lifecycle transition.' },
   };
   const itemSuccess = {
      200: {
         description: 'Registration form returned.',
         content: json(EventRegistrationFormResponse),
      },
      ...errors,
   };

   registry.registerPath({
      method: 'get',
      path: '/api/internal/events/{eventId}/registration-form',
      operationId: 'getEventRegistrationForm',
      tags: ['Event Registration Form'],
      security,
      request: { params },
      responses: itemSuccess,
   });
   registry.registerPath({
      method: 'put',
      path: '/api/internal/events/{eventId}/registration-form',
      operationId: 'putEventRegistrationForm',
      tags: ['Event Registration Form'],
      security,
      request: {
         params,
         body: {
            required: true,
            content: json(RegistrationFormBodySchema),
         },
      },
      responses: itemSuccess,
   });
   registry.registerPath({
      method: 'post',
      path: '/api/internal/events/{eventId}/registration-form/validate',
      operationId: 'validateEventRegistrationForm',
      tags: ['Event Registration Form'],
      security,
      request: { params },
      responses: {
         200: {
            description: 'Current form is valid.',
            content: json(EventRegistrationFormValidateResponse),
         },
         ...errors,
      },
   });
   registry.registerPath({
      method: 'post',
      path: '/api/internal/events/{eventId}/registration-form/preview',
      operationId: 'previewEventRegistrationForm',
      tags: ['Event Registration Form'],
      security,
      request: { params },
      responses: {
         200: {
            description: 'Registration form preview returned.',
            content: json(EventRegistrationFormPreviewResponse),
         },
         ...errors,
      },
   });
   for (const action of ['publish', 'close'] as const)
      registry.registerPath({
         method: 'post',
         path: `/api/internal/events/{eventId}/registration-form/${action}`,
         operationId: `${action}EventRegistrationForm`,
         tags: ['Event Registration Form'],
         security,
         request: { params },
         responses: itemSuccess,
      });
   registry.registerPath({
      method: 'post',
      path: '/api/internal/events/{eventId}/registration-form/duplicate',
      operationId: 'duplicateEventRegistrationForm',
      tags: ['Event Registration Form'],
      security,
      request: { params },
      responses: {
         201: {
            description: 'Registration form duplicated as a new draft version.',
            content: json(EventRegistrationFormResponse),
         },
         ...errors,
      },
   });
};
