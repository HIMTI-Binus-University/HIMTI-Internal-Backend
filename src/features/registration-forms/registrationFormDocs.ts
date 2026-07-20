import '@/docs/zodOpenApi.js';
import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import {
   errorResponseSchema,
   formFieldTypeSchema,
   formQuestionStatusSchema,
   idParamSchema,
   protectedEndpoint,
   registrationFormStatusSchema,
   validationErrorResponseSchema,
} from '@/docs/commonSchemas.js';

const tag = 'Registration forms';

const subEventIdParamSchema = z.object({
   subEventId: z.string(),
});

const updateRegistrationFormStatusRequestSchema = z.object({
   status: registrationFormStatusSchema,
});

const formQuestionOptionRequestSchema = z.object({
   label: z.string().min(1),
   value: z.string().min(1),
});

const createFormQuestionRequestSchema = z.object({
   label: z.string().min(1).max(255),
   fieldType: formFieldTypeSchema,
   isRequired: z.boolean().optional(),
   helpText: z.string().nullable().optional(),
   orderIndex: z.number().int().min(0).optional(),
   options: z.array(formQuestionOptionRequestSchema).optional(),
});

const updateFormQuestionRequestSchema = z.object({
   label: z.string().min(1).max(255).optional(),
   fieldType: formFieldTypeSchema.optional(),
   isRequired: z.boolean().optional(),
   helpText: z.string().nullable().optional(),
   orderIndex: z.number().int().min(0).optional(),
   status: formQuestionStatusSchema.optional(),
});

const reorderFormQuestionsRequestSchema = z.object({
   questionIds: z.array(z.string()).min(1),
});

const updateFormQuestionOptionRequestSchema = z.object({
   label: z.string().min(1).max(255).optional(),
   value: z.string().min(1).max(255).optional(),
   isActive: z.boolean().optional(),
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
   responseCount: z.number(),
});

const registrationFormResponseSchema = z.object({
   msg: z.literal('success'),
   data: registrationFormSchema,
});

const formQuestionMutationResponseSchema = z.object({
   msg: z.literal('success'),
   data: formQuestionSchema,
});

const formQuestionListResponseSchema = z.object({
   msg: z.literal('success'),
   data: z.array(formQuestionSchema),
});

const formQuestionOptionMutationResponseSchema = z.object({
   msg: z.literal('success'),
   data: formQuestionOptionSchema,
});

export const registerRegistrationFormDocs = (registry: OpenAPIRegistry) => {
   const UpdateRegistrationFormStatusRequest = registry.register(
      'UpdateRegistrationFormStatusRequest',
      updateRegistrationFormStatusRequestSchema,
   );
   const RegistrationFormResponse = registry.register(
      'RegistrationFormResponse',
      registrationFormResponseSchema,
   );
   const CreateFormQuestionRequest = registry.register(
      'CreateFormQuestionRequest',
      createFormQuestionRequestSchema,
   );
   const UpdateFormQuestionRequest = registry.register(
      'UpdateFormQuestionRequest',
      updateFormQuestionRequestSchema,
   );
   const ReorderFormQuestionsRequest = registry.register(
      'ReorderFormQuestionsRequest',
      reorderFormQuestionsRequestSchema,
   );
   const UpdateFormQuestionOptionRequest = registry.register(
      'UpdateFormQuestionOptionRequest',
      updateFormQuestionOptionRequestSchema,
   );
   const FormQuestionMutationResponse = registry.register(
      'FormQuestionMutationResponse',
      formQuestionMutationResponseSchema,
   );
   const FormQuestionListResponse = registry.register(
      'FormQuestionListResponse',
      formQuestionListResponseSchema,
   );
   const FormQuestionOptionMutationResponse = registry.register(
      'FormQuestionOptionMutationResponse',
      formQuestionOptionMutationResponseSchema,
   );

   registry.registerPath({
      method: 'post',
      path: '/api/registration-form/sub-event/{subEventId}',
      tags: [tag],
      summary: 'Create a registration form for a sub-event',
      description:
         'Requires manage_events permission and either Admin role or steering ' +
         'committee membership. Only one registration form is allowed per sub-event.',
      security: [protectedEndpoint],
      request: {
         params: subEventIdParamSchema,
      },
      responses: {
         201: {
            description: 'Registration form created.',
            content: {
               'application/json': { schema: RegistrationFormResponse },
            },
         },
         401: { description: 'Authentication required.' },
         403: { description: 'Missing permission or management access.' },
         404: {
            description: 'Sub-event not found.',
            content: { 'application/json': { schema: errorResponseSchema } },
         },
         409: {
            description: 'A registration form already exists.',
            content: { 'application/json': { schema: errorResponseSchema } },
         },
      },
   });

   registry.registerPath({
      method: 'get',
      path: '/api/registration-form/sub-event/{subEventId}',
      tags: [tag],
      summary: 'Get a registration form by sub-event',
      description:
         'Admin users can view any form. Other users must be assigned to the ' +
         'parent event committee.',
      security: [protectedEndpoint],
      request: {
         params: subEventIdParamSchema,
      },
      responses: {
         200: {
            description: 'Registration form detail.',
            content: {
               'application/json': { schema: RegistrationFormResponse },
            },
         },
         401: { description: 'Authentication required.' },
         403: { description: 'Missing permission or committee membership.' },
         404: {
            description: 'Sub-event or registration form not found.',
            content: { 'application/json': { schema: errorResponseSchema } },
         },
      },
   });

   registry.registerPath({
      method: 'get',
      path: '/api/registration-form/{id}',
      tags: [tag],
      summary: 'Get a registration form by ID',
      description:
         'Admin users can view any form. Other users must be assigned to the ' +
         'parent event committee.',
      security: [protectedEndpoint],
      request: {
         params: idParamSchema,
      },
      responses: {
         200: {
            description: 'Registration form detail.',
            content: {
               'application/json': { schema: RegistrationFormResponse },
            },
         },
         401: { description: 'Authentication required.' },
         403: { description: 'Missing permission or committee membership.' },
         404: {
            description: 'Registration form not found.',
            content: { 'application/json': { schema: errorResponseSchema } },
         },
      },
   });

   registry.registerPath({
      method: 'patch',
      path: '/api/registration-form/{id}/status',
      tags: [tag],
      summary: 'Update a registration form status',
      description:
         'Supports publishing a draft form, unpublishing a response-free form, ' +
         'and closing a form. Closed forms cannot be reopened.',
      security: [protectedEndpoint],
      request: {
         params: idParamSchema,
         body: {
            required: true,
            content: {
               'application/json': {
                  schema: UpdateRegistrationFormStatusRequest,
               },
            },
         },
      },
      responses: {
         200: {
            description: 'Registration form status updated.',
            content: {
               'application/json': { schema: RegistrationFormResponse },
            },
         },
         400: {
            description: 'Invalid transition or invalid form structure.',
            content: {
               'application/json': {
                  schema: validationErrorResponseSchema.or(errorResponseSchema),
               },
            },
         },
         401: { description: 'Authentication required.' },
         403: { description: 'Missing permission or management access.' },
         404: {
            description: 'Registration form not found.',
            content: { 'application/json': { schema: errorResponseSchema } },
         },
      },
   });

   registry.registerPath({
      method: 'post',
      path: '/api/registration-form/{id}/question',
      tags: [tag],
      summary: 'Create a form question',
      description:
         'Requires authentication, manage_events permission, and either Admin ' +
         'role or steering committee membership on the parent event. Only draft ' +
         'forms without responses can be edited. Field keys are generated by ' +
         'the backend and kept unique within the form.',
      security: [protectedEndpoint],
      request: {
         params: idParamSchema,
         body: {
            required: true,
            content: {
               'application/json': {
                  schema: CreateFormQuestionRequest,
               },
            },
         },
      },
      responses: {
         201: {
            description: 'Form question created.',
            content: {
               'application/json': {
                  schema: FormQuestionMutationResponse,
               },
            },
         },
         400: {
            description: 'Validation error or form is not editable.',
            content: {
               'application/json': {
                  schema: validationErrorResponseSchema.or(errorResponseSchema),
               },
            },
         },
         401: { description: 'Authentication required.' },
         403: {
            description:
               'Missing manage_events permission, Admin role, or steering committee membership.',
         },
         404: {
            description: 'Registration form not found.',
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
      path: '/api/registration-form/{id}/reorder-questions',
      tags: [tag],
      summary: 'Reorder form questions',
      description:
         'Requires authentication, manage_events permission, and either Admin ' +
         'role or steering committee membership on the parent event. The body ' +
         'must include all active question ids in the desired order.',
      security: [protectedEndpoint],
      request: {
         params: idParamSchema,
         body: {
            required: true,
            content: {
               'application/json': {
                  schema: ReorderFormQuestionsRequest,
               },
            },
         },
      },
      responses: {
         200: {
            description: 'Form questions reordered.',
            content: {
               'application/json': {
                  schema: FormQuestionListResponse,
               },
            },
         },
         400: {
            description: 'Validation error or form is not editable.',
            content: {
               'application/json': {
                  schema: validationErrorResponseSchema.or(errorResponseSchema),
               },
            },
         },
         401: { description: 'Authentication required.' },
         403: {
            description:
               'Missing manage_events permission, Admin role, or steering committee membership.',
         },
         404: {
            description: 'Registration form not found.',
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
      path: '/api/registration-form/question/{id}/option',
      tags: [tag],
      summary: 'Create a form question option',
      description:
         'Requires authentication, manage_events permission, and either Admin ' +
         'role or steering committee membership on the parent event. Only ' +
         'option-based questions on draft forms without responses can receive options.',
      security: [protectedEndpoint],
      request: {
         params: idParamSchema,
         body: {
            required: true,
            content: {
               'application/json': {
                  schema: formQuestionOptionRequestSchema,
               },
            },
         },
      },
      responses: {
         201: {
            description: 'Form question option created.',
            content: {
               'application/json': {
                  schema: FormQuestionOptionMutationResponse,
               },
            },
         },
         400: {
            description: 'Validation error or form is not editable.',
            content: {
               'application/json': {
                  schema: validationErrorResponseSchema.or(errorResponseSchema),
               },
            },
         },
         401: { description: 'Authentication required.' },
         403: {
            description:
               'Missing manage_events permission, Admin role, or steering committee membership.',
         },
         404: {
            description: 'Form question not found.',
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
      path: '/api/registration-form/question/{id}',
      tags: [tag],
      summary: 'Update a form question',
      description:
         'Requires authentication, manage_events permission, and either Admin ' +
         'role or steering committee membership on the parent event. Only draft ' +
         'forms without responses can be edited.',
      security: [protectedEndpoint],
      request: {
         params: idParamSchema,
         body: {
            required: true,
            content: {
               'application/json': {
                  schema: UpdateFormQuestionRequest,
               },
            },
         },
      },
      responses: {
         200: {
            description: 'Form question updated.',
            content: {
               'application/json': {
                  schema: FormQuestionMutationResponse,
               },
            },
         },
         400: {
            description: 'Validation error or form is not editable.',
            content: {
               'application/json': {
                  schema: validationErrorResponseSchema.or(errorResponseSchema),
               },
            },
         },
         401: { description: 'Authentication required.' },
         403: {
            description:
               'Missing manage_events permission, Admin role, or steering committee membership.',
         },
         404: {
            description: 'Form question not found.',
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
      path: '/api/registration-form/option/{id}',
      tags: [tag],
      summary: 'Update a form question option',
      description:
         'Requires authentication, manage_events permission, and either Admin ' +
         'role or steering committee membership on the parent event. Only draft ' +
         'forms without responses can be edited.',
      security: [protectedEndpoint],
      request: {
         params: idParamSchema,
         body: {
            required: true,
            content: {
               'application/json': {
                  schema: UpdateFormQuestionOptionRequest,
               },
            },
         },
      },
      responses: {
         200: {
            description: 'Form question option updated.',
            content: {
               'application/json': {
                  schema: FormQuestionOptionMutationResponse,
               },
            },
         },
         400: {
            description: 'Validation error or form is not editable.',
            content: {
               'application/json': {
                  schema: validationErrorResponseSchema.or(errorResponseSchema),
               },
            },
         },
         401: { description: 'Authentication required.' },
         403: {
            description:
               'Missing manage_events permission, Admin role, or steering committee membership.',
         },
         404: {
            description: 'Form question option not found.',
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
      path: '/api/registration-form/option/delete/{id}',
      tags: [tag],
      summary: 'Delete a form question option',
      description:
         'Requires authentication, manage_events permission, and either Admin ' +
         'role or steering committee membership on the parent event. Soft ' +
         'deletes the option by setting isActive to false.',
      security: [protectedEndpoint],
      request: {
         params: idParamSchema,
      },
      responses: {
         200: {
            description: 'Form question option deleted.',
            content: {
               'application/json': {
                  schema: FormQuestionOptionMutationResponse,
               },
            },
         },
         400: {
            description: 'Validation error or form is not editable.',
            content: {
               'application/json': {
                  schema: validationErrorResponseSchema.or(errorResponseSchema),
               },
            },
         },
         401: { description: 'Authentication required.' },
         403: {
            description:
               'Missing manage_events permission, Admin role, or steering committee membership.',
         },
         404: {
            description: 'Form question option not found.',
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
      path: '/api/registration-form/question/delete/{id}',
      tags: [tag],
      summary: 'Delete a form question',
      description:
         'Requires authentication, manage_events permission, and either Admin ' +
         'role or steering committee membership on the parent event. Soft ' +
         'deletes the question and deactivates related options.',
      security: [protectedEndpoint],
      request: {
         params: idParamSchema,
      },
      responses: {
         200: {
            description: 'Form question deleted.',
            content: {
               'application/json': {
                  schema: FormQuestionMutationResponse,
               },
            },
         },
         400: {
            description: 'Validation error or form is not editable.',
            content: {
               'application/json': {
                  schema: validationErrorResponseSchema.or(errorResponseSchema),
               },
            },
         },
         401: { description: 'Authentication required.' },
         403: {
            description:
               'Missing manage_events permission, Admin role, or steering committee membership.',
         },
         404: {
            description: 'Form question not found.',
            content: {
               'application/json': {
                  schema: errorResponseSchema,
               },
            },
         },
      },
   });
};
