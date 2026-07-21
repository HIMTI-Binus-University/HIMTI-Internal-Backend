import '@/docs/zodOpenApi.js';
import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import {
   errorResponseSchema,
   protectedEndpoint,
} from '@/docs/commonSchemas.js';
import {
   CreatePeriodSchema,
   CreateResourceSchema,
   MembershipResourceSchema,
   MembershipResourcesResponseSchema,
   MembershipStatusSchema,
   PeriodParamsSchema,
   RegistrationOpenSchema,
   ResourceOrderSchema,
   ResourceParamsSchema,
   UpdatePeriodSchema,
   UpdateResourceSchema,
} from './membershipSchema.js';

const success = (data: z.ZodTypeAny) =>
   z.object({ msg: z.literal('success'), data });
const periodSchema = z.object({
   id: z.string(),
   label: z.string(),
   isActive: z.boolean(),
   registrationOpen: z.boolean(),
   _count: z.object({ memberships: z.number(), resources: z.number() }),
});

const body = (schema: z.ZodTypeAny) => ({
   required: true,
   content: { 'application/json': { schema } },
});
const responses = (description: string, schema?: z.ZodTypeAny) => ({
   200: {
      description,
      ...(schema && { content: { 'application/json': { schema } } }),
   },
   400: {
      description: 'Invalid request.',
      content: { 'application/json': { schema: errorResponseSchema } },
   },
   401: {
      description: 'Authentication required.',
      content: { 'application/json': { schema: errorResponseSchema } },
   },
   403: {
      description: 'Permission denied.',
      content: { 'application/json': { schema: errorResponseSchema } },
   },
   404: {
      description: 'Record not found.',
      content: { 'application/json': { schema: errorResponseSchema } },
   },
});

export const registerMembershipDocs = (registry: OpenAPIRegistry) => {
   registry.registerPath({
      method: 'get',
      path: '/api/membership/status',
      tags: ['Membership'],
      summary: 'Get the current and available membership periods',
      security: [protectedEndpoint],
      responses: responses('Membership period status.', success(MembershipStatusSchema)),
   });

   registry.registerPath({
      method: 'get',
      path: '/api/membership/resources',
      tags: ['Membership'],
      summary: 'Get ordered resource cards for the current member period',
      security: [protectedEndpoint],
      responses: responses('Resources for the member period.', MembershipResourcesResponseSchema),
   });

   registry.registerPath({
      method: 'get',
      path: '/api/membership/periods',
      tags: ['Membership management'],
      summary: 'List membership periods',
      description: 'Requires manage_batch.',
      security: [protectedEndpoint],
      responses: responses('Membership periods.', success(z.array(periodSchema))),
   });

   registry.registerPath({
      method: 'post',
      path: '/api/membership/periods',
      tags: ['Membership management'],
      summary: 'Create a membership period',
      description: 'Requires manage_batch.',
      security: [protectedEndpoint],
      request: { body: body(CreatePeriodSchema) },
      responses: responses('Membership period created.'),
   });

   registry.registerPath({
      method: 'patch',
      path: '/api/membership/periods/{periodId}',
      tags: ['Membership management'],
      summary: 'Rename a membership period',
      description: 'Requires manage_batch.',
      security: [protectedEndpoint],
      request: { params: PeriodParamsSchema, body: body(UpdatePeriodSchema) },
      responses: responses('Membership period updated.'),
   });

   registry.registerPath({
      method: 'post',
      path: '/api/membership/periods/{periodId}/activate',
      tags: ['Membership management'],
      summary: 'Activate a membership period',
      description: 'Requires manage_batch.',
      security: [protectedEndpoint],
      request: { params: PeriodParamsSchema },
      responses: responses('Membership period activated.'),
   });

   registry.registerPath({
      method: 'patch',
      path: '/api/membership/periods/{periodId}/reregistration',
      tags: ['Membership management'],
      summary: 'Open or close re-registration',
      description: 'Requires manage_batch.',
      security: [protectedEndpoint],
      request: {
         params: PeriodParamsSchema,
         body: body(RegistrationOpenSchema),
      },
      responses: responses('Re-registration state updated.'),
   });

   registry.registerPath({
      method: 'get',
      path: '/api/membership/periods/{periodId}/resources',
      tags: ['Membership management'],
      summary: 'List a period’s resource cards',
      description: 'Requires manage_batch.',
      security: [protectedEndpoint],
      request: { params: PeriodParamsSchema },
      responses: responses('Resource cards.', success(z.array(MembershipResourceSchema))),
   });

   registry.registerPath({
      method: 'post',
      path: '/api/membership/periods/{periodId}/resources',
      tags: ['Membership management'],
      summary: 'Create a resource card',
      description: 'Requires manage_batch.',
      security: [protectedEndpoint],
      request: { params: PeriodParamsSchema, body: body(CreateResourceSchema) },
      responses: responses('Resource card created.'),
   });

   registry.registerPath({
      method: 'put',
      path: '/api/membership/periods/{periodId}/resources/order',
      tags: ['Membership management'],
      summary: 'Replace a period’s resource order',
      description: 'Requires manage_batch.',
      security: [protectedEndpoint],
      request: { params: PeriodParamsSchema, body: body(ResourceOrderSchema) },
      responses: responses('Resource cards reordered.'),
   });

   registry.registerPath({
      method: 'patch',
      path: '/api/membership/resources/{resourceId}',
      tags: ['Membership management'],
      summary: 'Update a resource card',
      description: 'Requires manage_batch.',
      security: [protectedEndpoint],
      request: { params: ResourceParamsSchema, body: body(UpdateResourceSchema) },
      responses: responses('Resource card updated.'),
   });
};
