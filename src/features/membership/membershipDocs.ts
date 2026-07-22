import '@/docs/zodOpenApi.js';
import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import {
   errorResponseSchema,
   protectedEndpoint,
   validationErrorResponseSchema,
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

const membershipTag = 'Membership';
const managementTag = 'Membership management';

const periodSchema = z.object({
   id: z.string(),
   label: z.string(),
   isActive: z.boolean(),
   registrationOpen: z.boolean(),
});

const periodListItemSchema = periodSchema.extend({
   _count: z.object({ memberships: z.number(), resources: z.number() }),
});

const successResponse = (data: z.ZodTypeAny) =>
   z.object({ msg: z.literal('success'), data });

const requestBody = (schema: z.ZodTypeAny) => ({
   required: true,
   content: { 'application/json': { schema } },
});

const validationResponse = {
   description: 'Validation error.',
   content: {
      'application/json': {
         schema: validationErrorResponseSchema.or(errorResponseSchema),
      },
   },
};

const errorResponse = (description: string) => ({
   description,
   content: { 'application/json': { schema: errorResponseSchema } },
});

export const registerMembershipDocs = (registry: OpenAPIRegistry) => {
   const MembershipStatusResponse = registry.register(
      'MembershipStatusResponse',
      successResponse(MembershipStatusSchema),
   );
   const MembershipResourcesResponse = registry.register(
      'MembershipResourcesResponse',
      MembershipResourcesResponseSchema,
   );
   const MembershipPeriodListResponse = registry.register(
      'MembershipPeriodListResponse',
      successResponse(z.array(periodListItemSchema)),
   );
   const MembershipPeriodMutationResponse = registry.register(
      'MembershipPeriodMutationResponse',
      successResponse(periodSchema),
   );
   const MembershipResourceListResponse = registry.register(
      'MembershipResourceListResponse',
      successResponse(z.array(MembershipResourceSchema)),
   );
   const MembershipResourceMutationResponse = registry.register(
      'MembershipResourceMutationResponse',
      successResponse(MembershipResourceSchema),
   );
   const MembershipResourceOrderResponse = registry.register(
      'MembershipResourceOrderResponse',
      successResponse(z.array(MembershipResourceSchema)),
   );
   const CreateMembershipPeriodRequest = registry.register(
      'CreateMembershipPeriodRequest',
      CreatePeriodSchema,
   );
   const UpdateMembershipPeriodRequest = registry.register(
      'UpdateMembershipPeriodRequest',
      UpdatePeriodSchema,
   );
   const MembershipRegistrationOpenRequest = registry.register(
      'MembershipRegistrationOpenRequest',
      RegistrationOpenSchema,
   );
   const CreateMembershipResourceRequest = registry.register(
      'CreateMembershipResourceRequest',
      CreateResourceSchema,
   );
   const UpdateMembershipResourceRequest = registry.register(
      'UpdateMembershipResourceRequest',
      UpdateResourceSchema,
   );
   const MembershipResourceOrderRequest = registry.register(
      'MembershipResourceOrderRequest',
      ResourceOrderSchema,
   );

   registry.registerPath({
      method: 'get',
      path: '/api/membership/status',
      tags: [membershipTag],
      summary: 'Get the current and available membership periods',
      security: [protectedEndpoint],
      responses: {
         200: {
            description: 'Membership period status.',
            content: {
               'application/json': { schema: MembershipStatusResponse },
            },
         },
         401: { description: 'Authentication required.' },
      },
   });

   registry.registerPath({
      method: 'get',
      path: '/api/membership/resources',
      tags: [membershipTag],
      summary: 'Get ordered resource cards for the current member period',
      security: [protectedEndpoint],
      responses: {
         200: {
            description: 'Resources for the member period.',
            content: {
               'application/json': { schema: MembershipResourcesResponse },
            },
         },
         401: { description: 'Authentication required.' },
         403: errorResponse('Initial member registration is required.'),
         404: errorResponse('A current membership period is not assigned.'),
      },
   });

   registry.registerPath({
      method: 'get',
      path: '/api/membership/periods',
      tags: [managementTag],
      summary: 'List membership periods',
      description: 'Requires the manage_batch permission.',
      security: [protectedEndpoint],
      responses: {
         200: {
            description: 'Membership periods.',
            content: {
               'application/json': { schema: MembershipPeriodListResponse },
            },
         },
         401: { description: 'Authentication required.' },
         403: { description: 'Missing manage_batch permission.' },
      },
   });

   registry.registerPath({
      method: 'post',
      path: '/api/membership/periods',
      tags: [managementTag],
      summary: 'Create a membership period',
      description:
         'Requires the manage_batch permission. New periods are inactive and closed for re-registration.',
      security: [protectedEndpoint],
      request: { body: requestBody(CreateMembershipPeriodRequest) },
      responses: {
         201: {
            description: 'Membership period created.',
            content: {
               'application/json': {
                  schema: MembershipPeriodMutationResponse,
               },
            },
         },
         400: validationResponse,
         401: { description: 'Authentication required.' },
         403: { description: 'Missing manage_batch permission.' },
         409: errorResponse('Membership period ID already exists.'),
      },
   });

   registry.registerPath({
      method: 'patch',
      path: '/api/membership/periods/{periodId}',
      tags: [managementTag],
      summary: 'Rename a membership period',
      description: 'Requires the manage_batch permission.',
      security: [protectedEndpoint],
      request: {
         params: PeriodParamsSchema,
         body: requestBody(UpdateMembershipPeriodRequest),
      },
      responses: {
         200: {
            description: 'Membership period updated.',
            content: {
               'application/json': {
                  schema: MembershipPeriodMutationResponse,
               },
            },
         },
         400: validationResponse,
         401: { description: 'Authentication required.' },
         403: { description: 'Missing manage_batch permission.' },
         404: errorResponse('Membership period not found.'),
      },
   });

   registry.registerPath({
      method: 'delete',
      path: '/api/membership/periods/{periodId}',
      tags: [managementTag],
      summary: 'Delete an empty inactive membership period',
      description: 'Requires the manage_batch permission.',
      security: [protectedEndpoint],
      request: { params: PeriodParamsSchema },
      responses: {
         204: { description: 'Membership period deleted.' },
         400: validationResponse,
         401: { description: 'Authentication required.' },
         403: { description: 'Missing manage_batch permission.' },
         404: errorResponse('Membership period not found.'),
         409: errorResponse('The period is active or is not empty.'),
      },
   });

   registry.registerPath({
      method: 'post',
      path: '/api/membership/periods/{periodId}/activate',
      tags: [managementTag],
      summary: 'Activate a membership period',
      description: 'Requires the manage_batch permission.',
      security: [protectedEndpoint],
      request: { params: PeriodParamsSchema },
      responses: {
         200: {
            description: 'Membership period activated.',
            content: {
               'application/json': {
                  schema: MembershipPeriodMutationResponse,
               },
            },
         },
         400: validationResponse,
         401: { description: 'Authentication required.' },
         403: { description: 'Missing manage_batch permission.' },
         404: errorResponse('Membership period not found.'),
      },
   });

   registry.registerPath({
      method: 'patch',
      path: '/api/membership/periods/{periodId}/reregistration',
      tags: [managementTag],
      summary: 'Open or close re-registration',
      description: 'Requires the manage_batch permission.',
      security: [protectedEndpoint],
      request: {
         params: PeriodParamsSchema,
         body: requestBody(MembershipRegistrationOpenRequest),
      },
      responses: {
         200: {
            description: 'Re-registration state updated.',
            content: {
               'application/json': {
                  schema: MembershipPeriodMutationResponse,
               },
            },
         },
         400: validationResponse,
         401: { description: 'Authentication required.' },
         403: { description: 'Missing manage_batch permission.' },
         404: errorResponse('Membership period not found.'),
         409: errorResponse(
            'Re-registration can only be opened for the active period.',
         ),
      },
   });

   registry.registerPath({
      method: 'get',
      path: '/api/membership/periods/{periodId}/resources',
      tags: [managementTag],
      summary: 'List a period’s resource cards',
      description: 'Requires the manage_batch permission.',
      security: [protectedEndpoint],
      request: { params: PeriodParamsSchema },
      responses: {
         200: {
            description: 'Resource cards.',
            content: {
               'application/json': { schema: MembershipResourceListResponse },
            },
         },
         400: validationResponse,
         401: { description: 'Authentication required.' },
         403: { description: 'Missing manage_batch permission.' },
         404: errorResponse('Membership period not found.'),
      },
   });

   registry.registerPath({
      method: 'post',
      path: '/api/membership/periods/{periodId}/resources',
      tags: [managementTag],
      summary: 'Create a resource card',
      description:
         'Requires the manage_batch permission. The link is optional. Links without a scheme default to HTTPS; only HTTP and HTTPS are accepted.',
      security: [protectedEndpoint],
      request: {
         params: PeriodParamsSchema,
         body: requestBody(CreateMembershipResourceRequest),
      },
      responses: {
         201: {
            description: 'Resource card created with a canonical link or null.',
            content: {
               'application/json': {
                  schema: MembershipResourceMutationResponse,
               },
            },
         },
         400: validationResponse,
         401: { description: 'Authentication required.' },
         403: { description: 'Missing manage_batch permission.' },
         404: errorResponse('Membership period not found.'),
      },
   });

   registry.registerPath({
      method: 'put',
      path: '/api/membership/periods/{periodId}/resources/order',
      tags: [managementTag],
      summary: 'Replace a period’s resource order',
      description: 'Requires the manage_batch permission.',
      security: [protectedEndpoint],
      request: {
         params: PeriodParamsSchema,
         body: requestBody(MembershipResourceOrderRequest),
      },
      responses: {
         200: {
            description: 'Ordered resource cards.',
            content: {
               'application/json': { schema: MembershipResourceOrderResponse },
            },
         },
         400: validationResponse,
         401: { description: 'Authentication required.' },
         403: { description: 'Missing manage_batch permission.' },
         404: errorResponse('Membership period not found.'),
      },
   });

   registry.registerPath({
      method: 'patch',
      path: '/api/membership/resources/{resourceId}',
      tags: [managementTag],
      summary: 'Update a resource card',
      description:
         'Requires the manage_batch permission. Omit the link to preserve it, send an empty value or null to clear it, or send an HTTP(S) link with an optional scheme.',
      security: [protectedEndpoint],
      request: {
         params: ResourceParamsSchema,
         body: requestBody(UpdateMembershipResourceRequest),
      },
      responses: {
         200: {
            description: 'Resource card updated.',
            content: {
               'application/json': {
                  schema: MembershipResourceMutationResponse,
               },
            },
         },
         400: validationResponse,
         401: { description: 'Authentication required.' },
         403: { description: 'Missing manage_batch permission.' },
         404: errorResponse('Membership resource not found.'),
      },
   });

   registry.registerPath({
      method: 'delete',
      path: '/api/membership/resources/{resourceId}',
      tags: [managementTag],
      summary: 'Delete a resource card',
      description: 'Requires the manage_batch permission.',
      security: [protectedEndpoint],
      request: { params: ResourceParamsSchema },
      responses: {
         204: { description: 'Resource card deleted.' },
         400: validationResponse,
         401: { description: 'Authentication required.' },
         403: { description: 'Missing manage_batch permission.' },
         404: errorResponse('Membership resource not found.'),
      },
   });
};
