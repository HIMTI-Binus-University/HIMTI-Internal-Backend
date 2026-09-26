import '@/docs/zodOpenApi.js';
import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import {
   errorResponseSchema,
   idParamSchema,
   listQuerySchema,
   paginationMetaSchema,
   protectedEndpoint,
   statusSchema,
   validationErrorResponseSchema,
} from '@/docs/commonSchemas.js';

const tag = 'Permissions';

const permissionSchema = z.object({
   id: z.string(),
   name: z.string(),
   status: statusSchema,
   createdAt: z.string().datetime(),
   createdBy: z.string(),
   updatedAt: z.string().datetime().nullable(),
   updatedBy: z.string().nullable(),
});

const createPermissionRequestSchema = z.object({
   name: z.string(),
});

const updatePermissionRequestSchema = z.object({
   name: z.string().optional(),
   status: statusSchema,
});

const permissionMutationResponseSchema = z.object({
   msg: z.literal('success'),
   data: permissionSchema,
});

const permissionListResponseSchema = z.object({
   msg: z.literal('success'),
   data: z.array(permissionSchema),
   meta: paginationMetaSchema,
});

export const registerPermissionDocs = (registry: OpenAPIRegistry) => {
   const CreatePermissionRequest = registry.register(
      'CreatePermissionRequest',
      createPermissionRequestSchema,
   );
   const UpdatePermissionRequest = registry.register(
      'UpdatePermissionRequest',
      updatePermissionRequestSchema,
   );
   const PermissionMutationResponse = registry.register(
      'PermissionMutationResponse',
      permissionMutationResponseSchema,
   );
   const PermissionListResponse = registry.register(
      'PermissionListResponse',
      permissionListResponseSchema,
   );

   registry.registerPath({
      method: 'post',
      path: '/api/permission',
      tags: [tag],
      summary: 'Create a permission',
      description:
         'Requires authentication and the manage_permissions permission.',
      security: [protectedEndpoint],
      request: {
         body: {
            required: true,
            content: {
               'application/json': {
                  schema: CreatePermissionRequest,
               },
            },
         },
      },
      responses: {
         200: {
            description: 'Permission created.',
            content: {
               'application/json': {
                  schema: PermissionMutationResponse,
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
         403: { description: 'Missing manage_permissions permission.' },
         409: {
            description: 'Permission name already exists.',
            content: {
               'application/json': {
                  schema: errorResponseSchema,
               },
            },
         },
      },
   });

   registry.registerPath({
      method: 'get',
      path: '/api/permission',
      tags: [tag],
      summary: 'List permissions',
      description:
         'Requires authentication and the manage_permissions permission. Status defaults to ACTIVE; only Admin users may request INACTIVE records.',
      security: [protectedEndpoint],
      request: {
         query: listQuerySchema,
      },
      responses: {
         200: {
            description: 'Permission list.',
            content: {
               'application/json': {
                  schema: PermissionListResponse,
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
         403: { description: 'Missing permission or inactive-status access.' },
      },
   });

   registry.registerPath({
      method: 'patch',
      path: '/api/permission/{id}',
      tags: [tag],
      summary: 'Update a permission',
      description:
         'Requires authentication and the manage_permissions permission.',
      security: [protectedEndpoint],
      request: {
         params: idParamSchema,
         body: {
            required: true,
            content: {
               'application/json': {
                  schema: UpdatePermissionRequest,
               },
            },
         },
      },
      responses: {
         200: {
            description: 'Permission updated.',
            content: {
               'application/json': {
                  schema: PermissionMutationResponse,
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
         403: { description: 'Missing manage_permissions permission.' },
         404: {
            description: 'Permission not found.',
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
      path: '/api/permission/delete/{id}',
      tags: [tag],
      summary: 'Soft delete a permission',
      description:
         'Requires authentication and the manage_permissions permission. The name is renamed internally to keep the unique constraint reusable.',
      security: [protectedEndpoint],
      request: {
         params: idParamSchema,
      },
      responses: {
         200: {
            description: 'Permission soft deleted.',
            content: {
               'application/json': {
                  schema: PermissionMutationResponse,
               },
            },
         },
         401: { description: 'Authentication required.' },
         403: { description: 'Missing manage_permissions permission.' },
         404: {
            description: 'Permission not found.',
            content: {
               'application/json': {
                  schema: errorResponseSchema,
               },
            },
         },
      },
   });
};
