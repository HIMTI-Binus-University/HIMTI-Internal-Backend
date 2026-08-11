import '@/docs/zodOpenApi.js';
import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

const tag = 'Link Workspaces';
const security = [{ sessionCookie: [] }];
const roleSchema = z.enum(['OWNER', 'EDITOR', 'VIEWER']);
const addMemberRoleSchema = z.enum(['EDITOR', 'VIEWER']);
const workspaceStatusSchema = z.enum(['ACTIVE', 'ARCHIVED']);
const linkStatusSchema = z.enum(['ACTIVE', 'INACTIVE']);
const shortCodeSchema = z
   .string()
   .min(3)
   .max(100)
   .regex(/^[a-zA-Z0-9]+$/);
const workspaceDescriptionSchema = z.string().max(5000).nullable();
const workspaceUpdateSchema = z
   .object({
      name: z.string().min(1).max(255).optional(),
      description: workspaceDescriptionSchema.optional(),
   })
   .refine((value) => Object.keys(value).length > 0, {
      message: 'At least one field is required',
   });
const linkUpdateSchema = z
   .object({
      originalUrl: z.string().url().optional(),
      shortCode: shortCodeSchema.optional(),
      expiresAt: z.string().datetime().optional(),
   })
   .refine((value) => Object.keys(value).length > 0, {
      message: 'At least one field is required',
   });
const idParams = z.object({ workspaceId: z.string() });
const userSchema = z.object({
   id: z.string(),
   name: z.string(),
   email: z.string().email().optional(),
   status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).optional(),
});
const memberSchema = z.object({
   workspaceId: z.string(),
   userId: z.string(),
   role: roleSchema,
   createdAt: z.string().datetime(),
   updatedAt: z.string().datetime().nullable().optional(),
   user: userSchema,
});
const workspaceSchema = z.object({
   id: z.string(),
   name: z.string(),
   description: z.string().nullable(),
   status: workspaceStatusSchema,
   createdAt: z.string().datetime(),
   updatedAt: z.string().datetime().nullable().optional(),
   createdBy: z.string(),
   updatedBy: z.string().nullable().optional(),
   members: z.array(memberSchema),
   _count: z.object({ links: z.number() }),
});
const urlSchema = z.object({
   id: z.string(),
   originalUrl: z.string().url(),
   shortCode: z.string(),
   expiresAt: z.string().datetime().nullable(),
   status: linkStatusSchema,
   createdAt: z.string().datetime(),
   updatedAt: z.string().datetime().nullable().optional(),
   createdBy: z.string(),
   updatedBy: z.string().nullable().optional(),
});
const linkSchema = z.object({
   id: z.string(),
   workspaceId: z.string(),
   urlId: z.string(),
   status: linkStatusSchema,
   createdAt: z.string().datetime(),
   updatedAt: z.string().datetime().nullable().optional(),
   createdBy: z.string(),
   updatedBy: z.string().nullable().optional(),
   url: urlSchema,
   creator: z.object({ id: z.string(), name: z.string() }),
});
const errorSchema = z.object({ status: z.string(), msg: z.string() });
const response = (data: z.ZodType) =>
   z.object({
      msg: z.literal('success'),
      data,
   });
const commonErrors = {
   400: { description: 'Invalid request.' },
   401: { description: 'Authentication required.' },
   403: {
      description:
         'Missing manage_urls permission, insufficient workspace role, or a prohibited self role change.',
   },
   404: { description: 'Workspace, member, URL, or link not found.' },
   409: {
      description:
         'Conflict, duplicate, archived workspace, or an attempted direct owner demotion.',
   },
};

export const registerLinkWorkspaceDocs = (registry: OpenAPIRegistry) => {
   const Workspace = registry.register('LinkWorkspace', workspaceSchema);
   const Member = registry.register('LinkWorkspaceMember', memberSchema);
   const Link = registry.register('LinkWorkspaceLink', linkSchema);
   registry.register('LinkWorkspaceError', errorSchema);

   registry.registerPath({
      method: 'get',
      path: '/api/link-workspaces',
      tags: [tag],
      summary: 'List accessible link workspaces',
      security,
      request: {
         query: z.object({
            page: z.coerce.number().int().min(1).optional(),
            limit: z.coerce.number().int().min(1).max(100).optional(),
            search: z.string().optional(),
            status: workspaceStatusSchema.optional(),
         }),
      },
      responses: {
         200: {
            description: 'Workspace list.',
            content: {
               'application/json': {
                  schema: z.object({
                     msg: z.literal('success'),
                     data: z.array(Workspace),
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
         ...commonErrors,
      },
   });
   registry.registerPath({
      method: 'post',
      path: '/api/link-workspaces',
      tags: [tag],
      summary: 'Create a workspace and become its owner',
      security,
      request: {
         body: {
            required: true,
            content: {
               'application/json': {
                  schema: z.object({
                     name: z.string().min(1).max(255),
                     description: workspaceDescriptionSchema.optional(),
                  }),
               },
            },
         },
      },
      responses: {
         201: {
            description: 'Workspace created.',
            content: { 'application/json': { schema: response(Workspace) } },
         },
         ...commonErrors,
      },
   });

   const workspaceOperations = [
      {
         method: 'get' as const,
         path: '/api/link-workspaces/{workspaceId}',
         summary: 'Get a workspace',
         schema: Workspace,
      },
      {
         method: 'put' as const,
         path: '/api/link-workspaces/{workspaceId}',
         summary: 'Update a workspace (owner)',
         schema: Workspace,
         body: workspaceUpdateSchema,
      },
      {
         method: 'patch' as const,
         path: '/api/link-workspaces/{workspaceId}/archive',
         summary: 'Archive a workspace (owner)',
         schema: Workspace,
      },
      {
         method: 'get' as const,
         path: '/api/link-workspaces/{workspaceId}/members',
         summary: 'List workspace members (owner)',
         schema: z.array(Member),
      },
      {
         method: 'get' as const,
         path: '/api/link-workspaces/{workspaceId}/links',
         summary: 'List active workspace links',
         schema: z.array(Link),
      },
   ];
   for (const operation of workspaceOperations) {
      registry.registerPath({
         method: operation.method,
         path: operation.path,
         tags: [tag],
         summary: operation.summary,
         security,
         request: {
            params: idParams,
            ...(operation.body && {
               body: {
                  required: true,
                  content: { 'application/json': { schema: operation.body } },
               },
            }),
         },
         responses: {
            200: {
               description: 'Success.',
               content: {
                  'application/json': { schema: response(operation.schema) },
               },
            },
            ...commonErrors,
         },
      });
   }

   registry.registerPath({
      method: 'post',
      path: '/api/link-workspaces/{workspaceId}/members',
      tags: [tag],
      summary: 'Add a non-owner workspace member (owner)',
      description:
         'New members can be EDITOR or VIEWER. Transfer ownership through the member role endpoint.',
      security,
      request: {
         params: idParams,
         body: {
            required: true,
            content: {
               'application/json': {
                  schema: z.object({
                     userId: z.string(),
                     role: addMemberRoleSchema,
                  }),
               },
            },
         },
      },
      responses: {
         201: {
            description: 'Member added.',
            content: { 'application/json': { schema: response(Member) } },
         },
         ...commonErrors,
      },
   });
   for (const method of ['patch', 'delete'] as const) {
      registry.registerPath({
         method,
         path: '/api/link-workspaces/{workspaceId}/members/{userId}',
         tags: [tag],
         summary:
            method === 'patch'
               ? 'Change a member role or transfer ownership (owner)'
               : 'Remove a member (owner)',
         description:
            method === 'patch'
               ? 'The caller cannot target their own membership, including admins. Setting another member to OWNER atomically demotes the current owner to EDITOR and promotes the target. The current owner cannot be directly demoted.'
               : undefined,
         security,
         request: {
            params: z.object({ workspaceId: z.string(), userId: z.string() }),
            ...(method === 'patch' && {
               body: {
                  required: true,
                  content: {
                     'application/json': {
                        schema: z.object({ role: roleSchema }),
                     },
                  },
               },
            }),
         },
         responses: {
            200: {
               description: 'Member updated.',
               content: { 'application/json': { schema: response(Member) } },
            },
            ...commonErrors,
         },
      });
   }

   registry.registerPath({
      method: 'post',
      path: '/api/link-workspaces/{workspaceId}/links',
      tags: [tag],
      summary: 'Create a workspace link (owner/editor)',
      security,
      request: {
         params: idParams,
         body: {
            required: true,
            content: {
               'application/json': {
                  schema: z.object({
                     originalUrl: z.string().url(),
                     shortCode: shortCodeSchema,
                     expiresAt: z.string().datetime().optional(),
                  }),
               },
            },
         },
      },
      responses: {
         201: {
            description: 'Link created.',
            content: { 'application/json': { schema: response(Link) } },
         },
         ...commonErrors,
      },
   });
   registry.registerPath({
      method: 'post',
      path: '/api/link-workspaces/{workspaceId}/links/attach',
      tags: [tag],
      summary: 'Attach an owned personal URL (owner/editor)',
      security,
      request: {
         params: idParams,
         body: {
            required: true,
            content: {
               'application/json': { schema: z.object({ urlId: z.string() }) },
            },
         },
      },
      responses: {
         201: {
            description: 'Personal URL attached.',
            content: { 'application/json': { schema: response(Link) } },
         },
         ...commonErrors,
      },
   });
   for (const operation of [
      {
         method: 'put' as const,
         path: '/api/link-workspaces/{workspaceId}/links/{linkId}',
         summary: 'Update a workspace link (owner/editor)',
         body: linkUpdateSchema,
      },
      {
         method: 'patch' as const,
         path: '/api/link-workspaces/{workspaceId}/links/{linkId}/deactivate',
         summary: 'Deactivate a workspace link (owner/editor)',
      },
   ]) {
      registry.registerPath({
         method: operation.method,
         path: operation.path,
         tags: [tag],
         summary: operation.summary,
         security,
         request: {
            params: z.object({ workspaceId: z.string(), linkId: z.string() }),
            ...(operation.body && {
               body: {
                  required: true,
                  content: { 'application/json': { schema: operation.body } },
               },
            }),
         },
         responses: {
            200: {
               description: 'Link updated.',
               content: { 'application/json': { schema: response(Link) } },
            },
            ...commonErrors,
         },
      });
   }
};
