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
   successResponseSchema,
   validationErrorResponseSchema,
} from '@/docs/commonSchemas.js';

const tag = 'Roles';

const permissionSummarySchema = z.object({
   id: z.string(),
   name: z.string(),
   status: statusSchema,
});

const roleSchema = z.object({
   id: z.string(),
   roleName: z.string(),
   status: statusSchema,
   createdAt: z.string().datetime(),
   createdBy: z.string(),
   updatedAt: z.string().datetime().nullable(),
   updatedBy: z.string().nullable(),
});

const roleWithPermissionsSchema = z.object({
   id: z.string(),
   roleName: z.string(),
   status: statusSchema,
   createdAt: z.string().datetime(),
   permissions: z.array(permissionSummarySchema),
});

const createRoleRequestSchema = z.object({
   roleName: z.string().max(255),
});

const updateRoleRequestSchema = z.object({
   roleName: z.string().max(255).optional(),
   status: statusSchema.optional(),
});

const roleUserRequestSchema = z.object({
   userId: z.string(),
   roleId: z.string(),
});

const rolePermissionRequestSchema = z.object({
   roleId: z.string(),
   permissionId: z.string(),
});

const roleMutationResponseSchema = z.object({
   msg: z.literal('success'),
   data: roleSchema,
});

const roleListResponseSchema = z.object({
   msg: z.literal('success'),
   data: z.array(roleWithPermissionsSchema),
   meta: paginationMetaSchema,
});

const roleDetailResponseSchema = z.object({
   msg: z.literal('success'),
   data: roleWithPermissionsSchema,
});

const userRoleAssignmentSchema = z.object({
   userId: z.string(),
   roleId: z.string(),
   assignedAt: z.string().datetime(),
});

const rolePermissionAssignmentSchema = z.object({
   roleId: z.string(),
   permissionId: z.string(),
   assignedAt: z.string().datetime(),
});

export const registerRoleDocs = (registry: OpenAPIRegistry) => {
   const CreateRoleRequest = registry.register(
      'CreateRoleRequest',
      createRoleRequestSchema,
   );
   const UpdateRoleRequest = registry.register(
      'UpdateRoleRequest',
      updateRoleRequestSchema,
   );
   const RoleUserRequest = registry.register(
      'RoleUserRequest',
      roleUserRequestSchema,
   );
   const RolePermissionRequest = registry.register(
      'RolePermissionRequest',
      rolePermissionRequestSchema,
   );
   const RoleMutationResponse = registry.register(
      'RoleMutationResponse',
      roleMutationResponseSchema,
   );
   const RoleListResponse = registry.register(
      'RoleListResponse',
      roleListResponseSchema,
   );
   const RoleDetailResponse = registry.register(
      'RoleDetailResponse',
      roleDetailResponseSchema,
   );

   registry.registerPath({
      method: 'get',
      path: '/api/roles',
      tags: [tag],
      summary: 'List roles',
      description:
         'Requires authentication and the manage_roles permission. Status defaults to ACTIVE; only Admin users may request INACTIVE records.',
      security: [protectedEndpoint],
      request: {
         query: listQuerySchema,
      },
      responses: {
         200: {
            description: 'Role list.',
            content: {
               'application/json': {
                  schema: RoleListResponse,
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
      method: 'get',
      path: '/api/role/{id}',
      tags: [tag],
      summary: 'Get a role by ID',
      description: 'Requires authentication and the manage_roles permission.',
      security: [protectedEndpoint],
      request: {
         params: idParamSchema,
      },
      responses: {
         200: {
            description: 'Role detail.',
            content: {
               'application/json': {
                  schema: RoleDetailResponse,
               },
            },
         },
         401: { description: 'Authentication required.' },
         403: { description: 'Missing manage_roles permission.' },
         404: {
            description: 'Role not found.',
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
      path: '/api/role',
      tags: [tag],
      summary: 'Create a role',
      description: 'Requires authentication and the manage_roles permission.',
      security: [protectedEndpoint],
      request: {
         body: {
            required: true,
            content: {
               'application/json': {
                  schema: CreateRoleRequest,
               },
            },
         },
      },
      responses: {
         201: {
            description: 'Role created.',
            content: {
               'application/json': {
                  schema: RoleMutationResponse,
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
         403: { description: 'Missing manage_roles permission.' },
         409: {
            description: 'Role name already exists.',
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
      path: '/api/role/{id}',
      tags: [tag],
      summary: 'Update a role',
      description: 'Requires authentication and the manage_roles permission.',
      security: [protectedEndpoint],
      request: {
         params: idParamSchema,
         body: {
            required: true,
            content: {
               'application/json': {
                  schema: UpdateRoleRequest,
               },
            },
         },
      },
      responses: {
         200: {
            description: 'Role updated.',
            content: {
               'application/json': {
                  schema: RoleMutationResponse,
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
         403: { description: 'Missing manage_roles permission.' },
         404: {
            description: 'Role not found.',
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
      path: '/api/role/delete/{id}',
      tags: [tag],
      summary: 'Soft delete a role',
      description:
         'Requires authentication and the manage_roles permission. The role name is renamed internally to keep the unique constraint reusable.',
      security: [protectedEndpoint],
      request: {
         params: idParamSchema,
      },
      responses: {
         200: {
            description: 'Role soft deleted.',
            content: {
               'application/json': {
                  schema: RoleMutationResponse,
               },
            },
         },
         401: { description: 'Authentication required.' },
         403: { description: 'Missing manage_roles permission.' },
         404: {
            description: 'Role not found.',
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
      path: '/api/role/assign-user',
      tags: [tag],
      summary: 'Assign a role to a user',
      description: 'Requires authentication and the manage_roles permission.',
      security: [protectedEndpoint],
      request: {
         body: {
            required: true,
            content: {
               'application/json': {
                  schema: RoleUserRequest,
               },
            },
         },
      },
      responses: {
         200: {
            description: 'Role assigned to user.',
            content: {
               'application/json': {
                  schema: z.object({
                     msg: z.literal('success'),
                     data: userRoleAssignmentSchema,
                  }),
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
         403: { description: 'Missing manage_roles permission.' },
         409: {
            description: 'The user already has this role.',
            content: {
               'application/json': {
                  schema: errorResponseSchema,
               },
            },
         },
      },
   });

   registry.registerPath({
      method: 'delete',
      path: '/api/role/remove-user',
      tags: [tag],
      summary: 'Remove a role from a user',
      description: 'Requires authentication and the manage_roles permission.',
      security: [protectedEndpoint],
      request: {
         body: {
            required: true,
            content: {
               'application/json': {
                  schema: RoleUserRequest,
               },
            },
         },
      },
      responses: {
         200: {
            description: 'Role removed from user.',
            content: {
               'application/json': {
                  schema: successResponseSchema,
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
         403: { description: 'Missing manage_roles permission.' },
         404: {
            description: 'Assignment not found.',
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
      path: '/api/role/assign-permission',
      tags: [tag],
      summary: 'Assign a permission to a role',
      description: 'Requires authentication and the manage_roles permission.',
      security: [protectedEndpoint],
      request: {
         body: {
            required: true,
            content: {
               'application/json': {
                  schema: RolePermissionRequest,
               },
            },
         },
      },
      responses: {
         200: {
            description: 'Permission assigned to role.',
            content: {
               'application/json': {
                  schema: z.object({
                     msg: z.literal('success'),
                     data: rolePermissionAssignmentSchema,
                  }),
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
         403: { description: 'Missing manage_roles permission.' },
         409: {
            description: 'The role already has this permission.',
            content: {
               'application/json': {
                  schema: errorResponseSchema,
               },
            },
         },
      },
   });

   registry.registerPath({
      method: 'delete',
      path: '/api/role/remove-permission',
      tags: [tag],
      summary: 'Remove a permission from a role',
      description: 'Requires authentication and the manage_roles permission.',
      security: [protectedEndpoint],
      request: {
         body: {
            required: true,
            content: {
               'application/json': {
                  schema: RolePermissionRequest,
               },
            },
         },
      },
      responses: {
         200: {
            description: 'Permission removed from role.',
            content: {
               'application/json': {
                  schema: successResponseSchema,
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
         403: { description: 'Missing manage_roles permission.' },
         404: {
            description: 'Assignment not found.',
            content: {
               'application/json': {
                  schema: errorResponseSchema,
               },
            },
         },
      },
   });
};
