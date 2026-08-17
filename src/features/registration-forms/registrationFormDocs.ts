import '@/docs/zodOpenApi.js';
import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import {
   errorResponseSchema,
   formFieldTypeSchema,
   formQuestionStatusSchema,
   idParamSchema,
   protectedEndpoint,
   validationErrorResponseSchema,
} from '@/docs/commonSchemas.js';
import {
   CloneRegistrationFormV1Schema,
   CreateRegistrationFormV1Schema,
   FormValidationSchema,
   RegistrationFormLifecycleV1Schema,
   SaveRegistrationFormDraftV1Schema,
} from './registrationFormSchema.js';

const tag = 'Registration forms';

const registrationFormStageV1Schema = z.enum([
   'REGISTRATION',
   'POST_SUBMISSION',
   'POST_APPROVAL',
]);
const registrationFormStatusV1Schema = z.enum(['DRAFT', 'PUBLISHED', 'CLOSED']);
const validationIssueV1Schema = z.object({
   code: z.string(),
   path: z.string(),
   message: z.string(),
});
const validationResultV1Schema = z.object({
   valid: z.boolean(),
   revision: z.number().int().positive(),
   issues: z.array(validationIssueV1Schema),
});
const previewValidationResultV1Schema = validationResultV1Schema.omit({
   revision: true,
});
const builderOptionV1Schema = z.object({
   id: z.string(),
   formQuestionId: z.string(),
   label: z.string(),
   value: z.string(),
   isActive: z.boolean(),
   orderIndex: z.number().int().min(0),
   createdAt: z.string().datetime(),
   createdBy: z.string(),
   updatedAt: z.string().datetime().nullable(),
   updatedBy: z.string().nullable(),
});
const builderQuestionV1Schema = z.object({
   id: z.string(),
   registrationFormId: z.string(),
   sectionId: z.string().nullable(),
   label: z.string(),
   fieldKey: z.string(),
   fieldType: formFieldTypeSchema,
   isRequired: z.boolean(),
   helpText: z.string().nullable(),
   validation: FormValidationSchema,
   orderIndex: z.number().int().min(0),
   status: formQuestionStatusSchema,
   createdAt: z.string().datetime(),
   createdBy: z.string(),
   updatedAt: z.string().datetime().nullable(),
   updatedBy: z.string().nullable(),
   options: z.array(builderOptionV1Schema),
});
const builderSectionV1Schema = z.object({
   id: z.string(),
   registrationFormId: z.string(),
   title: z.string(),
   description: z.string().nullable(),
   orderIndex: z.number().int().min(0),
   status: formQuestionStatusSchema,
   createdAt: z.string().datetime(),
   updatedAt: z.string().datetime().nullable(),
   questions: z.array(builderQuestionV1Schema),
});
const builderFormV1Schema = z.object({
   id: z.string(),
   subEventId: z.string(),
   status: registrationFormStatusV1Schema,
   name: z.string(),
   description: z.string().nullable(),
   logicalKey: z.string().nullable(),
   version: z.number().int().positive(),
   revision: z.number().int().positive(),
   stage: registrationFormStageV1Schema,
   publishedAt: z.string().datetime().nullable(),
   supersedesId: z.string().nullable(),
   createdAt: z.string().datetime(),
   createdBy: z.string(),
   updatedAt: z.string().datetime().nullable(),
   updatedBy: z.string().nullable(),
   subEvent: z.object({ eventId: z.string() }),
   sections: z.array(builderSectionV1Schema),
});
const publishedOptionV1Schema = builderOptionV1Schema.pick({
   id: true,
   label: true,
   value: true,
   orderIndex: true,
});
const publishedQuestionV1Schema = builderQuestionV1Schema
   .pick({
      id: true,
      label: true,
      fieldKey: true,
      fieldType: true,
      isRequired: true,
      helpText: true,
      validation: true,
      orderIndex: true,
   })
   .extend({ options: z.array(publishedOptionV1Schema) });
const publishedSectionV1Schema = builderSectionV1Schema
   .pick({
      id: true,
      title: true,
      description: true,
      orderIndex: true,
   })
   .extend({ questions: z.array(publishedQuestionV1Schema) });
const publishedFormV1Schema = builderFormV1Schema
   .pick({
      id: true,
      logicalKey: true,
      version: true,
      name: true,
      description: true,
      stage: true,
      publishedAt: true,
   })
   .extend({ sections: z.array(publishedSectionV1Schema) });

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
   orderIndex: z.number().int().min(0),
   createdAt: z.string().datetime(),
   createdBy: z.string(),
   updatedAt: z.string().datetime().nullable(),
   updatedBy: z.string().nullable(),
});

const formQuestionSchema = z.object({
   id: z.string(),
   registrationFormId: z.string(),
   sectionId: z.string().nullable(),
   label: z.string(),
   fieldKey: z.string(),
   fieldType: formFieldTypeSchema,
   isRequired: z.boolean(),
   helpText: z.string().nullable(),
   validation: FormValidationSchema,
   orderIndex: z.number(),
   status: formQuestionStatusSchema,
   createdAt: z.string().datetime(),
   createdBy: z.string(),
   updatedAt: z.string().datetime().nullable(),
   updatedBy: z.string().nullable(),
   options: z.array(formQuestionOptionSchema),
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
   const RegistrationFormDraftV1 = registry.register(
      'RegistrationFormDraftV1',
      SaveRegistrationFormDraftV1Schema,
   );
   const CreateRegistrationFormV1 = registry.register(
      'CreateRegistrationFormV1',
      CreateRegistrationFormV1Schema,
   );
   const CloneRegistrationFormV1 = registry.register(
      'CloneRegistrationFormV1',
      CloneRegistrationFormV1Schema,
   );
   const RegistrationFormLifecycleRequestV1 = registry.register(
      'RegistrationFormLifecycleRequestV1',
      RegistrationFormLifecycleV1Schema,
   );
   const RegistrationFormValidationMetadataV1 = registry.register(
      'RegistrationFormValidationMetadataV1',
      FormValidationSchema,
   );
   const RegistrationFormValidationIssueV1 = registry.register(
      'RegistrationFormValidationIssueV1',
      validationIssueV1Schema,
   );
   const RegistrationFormValidationResultV1 = registry.register(
      'RegistrationFormValidationResultV1',
      validationResultV1Schema,
   );
   const RegistrationFormBuilderOptionV1 = registry.register(
      'RegistrationFormBuilderOptionV1',
      builderOptionV1Schema,
   );
   const RegistrationFormBuilderQuestionV1 = registry.register(
      'RegistrationFormBuilderQuestionV1',
      builderQuestionV1Schema,
   );
   const RegistrationFormBuilderSectionV1 = registry.register(
      'RegistrationFormBuilderSectionV1',
      builderSectionV1Schema,
   );
   const RegistrationFormBuilderV1 = registry.register(
      'RegistrationFormBuilderV1',
      builderFormV1Schema,
   );
   const RegistrationFormPreviewV1 = registry.register(
      'RegistrationFormPreviewV1',
      SaveRegistrationFormDraftV1Schema.extend({
         validation: previewValidationResultV1Schema,
      }),
   );
   const RegistrationFormPublishedOptionV1 = registry.register(
      'RegistrationFormPublishedOptionV1',
      publishedOptionV1Schema,
   );
   const RegistrationFormPublishedQuestionV1 = registry.register(
      'RegistrationFormPublishedQuestionV1',
      publishedQuestionV1Schema,
   );
   const RegistrationFormPublishedSectionV1 = registry.register(
      'RegistrationFormPublishedSectionV1',
      publishedSectionV1Schema,
   );
   const RegistrationFormPublishedV1 = registry.register(
      'RegistrationFormPublishedV1',
      publishedFormV1Schema,
   );
   const RegistrationFormBuilderV1Response = registry.register(
      'RegistrationFormBuilderV1Response',
      z.object({ msg: z.literal('success'), data: RegistrationFormBuilderV1 }),
   );
   const RegistrationFormBuilderV1ListResponse = registry.register(
      'RegistrationFormBuilderV1ListResponse',
      z.object({
         msg: z.literal('success'),
         data: z.array(RegistrationFormBuilderV1),
      }),
   );
   const RegistrationFormValidationV1Response = registry.register(
      'RegistrationFormValidationV1Response',
      z.object({
         msg: z.literal('success'),
         data: RegistrationFormValidationResultV1,
      }),
   );
   const RegistrationFormPreviewV1Response = registry.register(
      'RegistrationFormPreviewV1Response',
      z.object({ msg: z.literal('success'), data: RegistrationFormPreviewV1 }),
   );
   const RegistrationFormPublishedV1Response = registry.register(
      'RegistrationFormPublishedV1Response',
      z.object({
         msg: z.literal('success'),
         data: RegistrationFormPublishedV1,
      }),
   );
   void RegistrationFormValidationMetadataV1;
   void RegistrationFormValidationIssueV1;
   void RegistrationFormBuilderOptionV1;
   void RegistrationFormBuilderQuestionV1;
   void RegistrationFormBuilderSectionV1;
   void RegistrationFormPublishedOptionV1;
   void RegistrationFormPublishedQuestionV1;
   void RegistrationFormPublishedSectionV1;
   const v1Responses = {
      200: {
         description: 'Successful registration form operation.',
         content: {
            'application/json': { schema: RegistrationFormBuilderV1Response },
         },
      },
      400: {
         description: 'Request or form-rule validation failed.',
         content: {
            'application/json': {
               schema: validationErrorResponseSchema.or(errorResponseSchema),
            },
         },
      },
      401: { description: 'Authentication required.' },
      403: { description: 'Permission or event object authorization failed.' },
      404: { description: 'Registration form or sub-event not found.' },
      409: { description: 'Lifecycle or optimistic revision conflict.' },
   };

   registry.registerPath({
      method: 'get',
      path: '/api/v1/registration-form',
      tags: [tag],
      operationId: 'listRegistrationFormsV1',
      summary: 'List versioned registration forms',
      security: [protectedEndpoint],
      request: { query: z.object({ subEventId: z.string() }) },
      responses: {
         ...v1Responses,
         200: {
            description: 'Forms returned.',
            content: {
               'application/json': {
                  schema: RegistrationFormBuilderV1ListResponse,
               },
            },
         },
      },
   });
   registry.registerPath({
      method: 'post',
      path: '/api/v1/registration-form',
      tags: [tag],
      operationId: 'createRegistrationFormV1',
      summary: 'Create a versioned form draft',
      security: [protectedEndpoint],
      request: {
         body: {
            required: true,
            content: {
               'application/json': { schema: CreateRegistrationFormV1 },
            },
         },
      },
      responses: {
         ...v1Responses,
         201: {
            description: 'Draft created.',
            content: {
               'application/json': {
                  schema: RegistrationFormBuilderV1Response,
               },
            },
         },
      },
   });
   registry.registerPath({
      method: 'get',
      path: '/api/v1/registration-form/{id}',
      tags: [tag],
      operationId: 'getRegistrationFormV1',
      summary: 'Get a form builder version',
      security: [protectedEndpoint],
      request: { params: idParamSchema },
      responses: v1Responses,
   });
   registry.registerPath({
      method: 'put',
      path: '/api/v1/registration-form/{id}/draft',
      tags: [tag],
      operationId: 'saveRegistrationFormDraftV1',
      summary: 'Atomically save and reorder a complete draft',
      description:
         'Uses revision for optimistic locking. Omitted persisted sections, questions, and options are deactivated; IDs may move questions between sections.',
      security: [protectedEndpoint],
      request: {
         params: idParamSchema,
         body: {
            required: true,
            content: {
               'application/json': { schema: RegistrationFormDraftV1 },
            },
         },
      },
      responses: v1Responses,
   });
   const draftOperationRequest = {
      params: idParamSchema,
      body: {
         required: true,
         content: {
            'application/json': { schema: RegistrationFormDraftV1 },
         },
      },
   };
   registry.registerPath({
      method: 'post',
      path: '/api/v1/registration-form/{id}/validate',
      operationId: 'validateRegistrationFormV1',
      summary: 'Validate a complete draft',
      tags: [tag],
      security: [protectedEndpoint],
      request: draftOperationRequest,
      responses: {
         ...v1Responses,
         200: {
            description: 'Validation result returned.',
            content: {
               'application/json': {
                  schema: RegistrationFormValidationV1Response,
               },
            },
         },
      },
   });
   registry.registerPath({
      method: 'post',
      path: '/api/v1/registration-form/{id}/preview',
      operationId: 'previewRegistrationFormV1',
      summary: 'Preview a complete draft',
      tags: [tag],
      security: [protectedEndpoint],
      request: draftOperationRequest,
      responses: {
         ...v1Responses,
         200: {
            description: 'Preview returned.',
            content: {
               'application/json': {
                  schema: RegistrationFormPreviewV1Response,
               },
            },
         },
      },
   });
   registry.registerPath({
      method: 'post',
      path: '/api/v1/registration-form/{id}/clone',
      tags: [tag],
      operationId: 'cloneRegistrationFormV1',
      summary: 'Clone a form as the next logical version',
      security: [protectedEndpoint],
      request: {
         params: idParamSchema,
         body: {
            content: {
               'application/json': { schema: CloneRegistrationFormV1 },
            },
         },
      },
      responses: {
         ...v1Responses,
         201: {
            description: 'Version cloned.',
            content: {
               'application/json': {
                  schema: RegistrationFormBuilderV1Response,
               },
            },
         },
      },
   });
   for (const operation of [
      {
         path: '/api/v1/registration-form/{id}/publish',
         operationId: 'publishRegistrationFormV1',
         summary: 'Publish a draft version',
      },
      {
         path: '/api/v1/registration-form/{id}/close',
         operationId: 'closeRegistrationFormV1',
         summary: 'Close a published version',
      },
   ])
      registry.registerPath({
         method: 'post',
         ...operation,
         tags: [tag],
         security: [protectedEndpoint],
         request: {
            params: idParamSchema,
            body: {
               required: true,
               content: {
                  'application/json': {
                     schema: RegistrationFormLifecycleRequestV1,
                  },
               },
            },
         },
         responses: v1Responses,
      });
   registry.registerPath({
      method: 'get',
      path: '/api/v1/registration-form/published/{subEventId}/{logicalKey}',
      tags: [tag],
      operationId: 'getPublishedRegistrationFormV1',
      summary: 'Get the stable participant form contract',
      request: {
         params: z.object({ subEventId: z.string(), logicalKey: z.string() }),
      },
      responses: {
         ...v1Responses,
         200: {
            description: 'Published participant form returned.',
            content: {
               'application/json': {
                  schema: RegistrationFormPublishedV1Response,
               },
            },
         },
      },
   });
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
