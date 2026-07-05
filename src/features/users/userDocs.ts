import '@/docs/zodOpenApi.js';
import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import {
   errorResponseSchema,
   idParamSchema,
   listQuerySchema,
   paginationMetaSchema,
   protectedEndpoint,
   relationSummarySchema,
   statusSchema,
   userStatusSchema,
   validationErrorResponseSchema,
} from '@/docs/commonSchemas.js';

const tag = 'Users';

const userRoleSchema = z.object({
   id: z.string(),
   roleName: z.string(),
   status: statusSchema,
});

const userPermissionSchema = z.object({
   id: z.string(),
   name: z.string(),
   status: statusSchema,
});

const userListItemSchema = z.object({
   id: z.string(),
   name: z.string(),
   email: z.string().email(),
   emailVerified: z.boolean(),
   outlookEmail: z.string().email().nullable(),
   image: z.string().nullable(),
   status: userStatusSchema,
   nim: z.string().nullable(),
   universityId: z.string().nullable(),
   studyProgramId: z.string().nullable(),
   graduateBatch: z.string().nullable(),
   phoneNumber: z.string().nullable(),
   lineId: z.string().nullable(),
   createdAt: z.string().datetime(),
   university: relationSummarySchema,
   studyProgram: relationSummarySchema,
   roles: z.array(userRoleSchema),
});

const userDetailSchema = userListItemSchema.extend({
   permissions: z.array(userPermissionSchema),
});

const fullUserSchema = z.object({
   id: z.string(),
   name: z.string(),
   email: z.string().email(),
   emailVerified: z.boolean(),
   outlookEmail: z.string().email().nullable(),
   outlookEmailVerified: z.boolean(),
   image: z.string().nullable(),
   status: userStatusSchema,
   nim: z.string().nullable(),
   universityId: z.string().nullable(),
   studyProgramId: z.string().nullable(),
   graduateBatch: z.string().nullable(),
   phoneNumber: z.string().nullable(),
   lineId: z.string().nullable(),
   createdAt: z.string().datetime(),
   createdBy: z.string().nullable(),
   updatedAt: z.string().datetime().nullable(),
   updatedBy: z.string().nullable(),
});

const updateUserRequestSchema = z.object({
   name: z.string().max(255).optional(),
   email: z.string().email().max(100).optional(),
   emailVerified: z.boolean().optional(),
   outlookEmail: z.string().email().max(100).nullable().optional(),
   outlookEmailVerified: z.boolean().optional(),
   image: z.string().nullable().optional(),
   status: statusSchema.optional(),
   nim: z.string().max(50).nullable().optional(),
   universityId: z.string().nullable().optional(),
   studyProgramId: z.string().nullable().optional(),
   graduateBatch: z.string().max(20).nullable().optional(),
   phoneNumber: z.string().max(20).nullable().optional(),
   lineId: z.string().max(50).nullable().optional(),
});

const userListResponseSchema = z.object({
   msg: z.literal('success'),
   data: z.array(userListItemSchema),
   meta: paginationMetaSchema,
});

const userDetailResponseSchema = z.object({
   msg: z.literal('success'),
   data: userDetailSchema,
});

const userMutationResponseSchema = z.object({
   msg: z.literal('success'),
   data: fullUserSchema,
});

export const registerUserDocs = (registry: OpenAPIRegistry) => {
   const UpdateUserRequest = registry.register(
      'UpdateUserRequest',
      updateUserRequestSchema,
   );
   const UserListResponse = registry.register(
      'UserListResponse',
      userListResponseSchema,
   );
   const UserDetailResponse = registry.register(
      'UserDetailResponse',
      userDetailResponseSchema,
   );
   const UserMutationResponse = registry.register(
      'UserMutationResponse',
      userMutationResponseSchema,
   );

   registry.registerPath({
      method: 'get',
      path: '/api/users',
      tags: [tag],
      summary: 'List users',
      description:
         'Requires authentication and the manage_users permission. Status defaults to ACTIVE; only Admin users may request INACTIVE records.',
      security: [protectedEndpoint],
      request: {
         query: listQuerySchema,
      },
      responses: {
         200: {
            description: 'User list.',
            content: {
               'application/json': {
                  schema: UserListResponse,
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
      path: '/api/user/{id}',
      tags: [tag],
      summary: 'Get a user by ID',
      description: 'Requires authentication and the manage_users permission.',
      security: [protectedEndpoint],
      request: {
         params: idParamSchema,
      },
      responses: {
         200: {
            description: 'User detail.',
            content: {
               'application/json': {
                  schema: UserDetailResponse,
               },
            },
         },
         401: { description: 'Authentication required.' },
         403: { description: 'Missing manage_users permission.' },
         404: {
            description: 'User not found.',
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
      path: '/api/user/{id}',
      tags: [tag],
      summary: 'Update a user',
      description: 'Requires authentication and the manage_users permission.',
      security: [protectedEndpoint],
      request: {
         params: idParamSchema,
         body: {
            required: true,
            content: {
               'application/json': {
                  schema: UpdateUserRequest,
               },
            },
         },
      },
      responses: {
         200: {
            description: 'User updated.',
            content: {
               'application/json': {
                  schema: UserMutationResponse,
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
         403: { description: 'Missing manage_users permission.' },
         404: {
            description: 'User not found.',
            content: {
               'application/json': {
                  schema: errorResponseSchema,
               },
            },
         },
      },
   });
};
