import '@/docs/zodOpenApi.js';
import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import {
   errorResponseSchema,
   protectedEndpoint,
   userStatusSchema,
   validationErrorResponseSchema,
} from '@/docs/commonSchemas.js';

const tag = 'Registration';

const completeProfileRequestSchema = z.object({
   name: z.string(),
   nim: z.string().optional(),
   universityId: z.string(),
   outlookEmail: z.string().optional(),
   studyProgramId: z.string(),
   graduateBatch: z.string(),
   phoneNumber: z.string(),
   lineId: z.string(),
   status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
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

const profileResponseSchema = fullUserSchema.extend({
   roles: z.array(z.string()),
   permissions: z.array(z.string()),
});

const completeProfileResponseSchema = z.object({
   msg: z.literal('success'),
   notice: z.string().optional(),
   data: fullUserSchema,
});

const verifyOutlookResponseSchema = z.object({
   msg: z.literal('Your Outlook Email has been verified'),
});

const getMeResponseSchema = z.object({
   msg: z.literal('success'),
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
   roles: z.array(z.string()),
   permissions: z.array(z.string()),
});

export const registerRegistrationDocs = (registry: OpenAPIRegistry) => {
   const CompleteProfileRequest = registry.register(
      'CompleteProfileRequest',
      completeProfileRequestSchema,
   );
   const CompleteProfileResponse = registry.register(
      'CompleteProfileResponse',
      completeProfileResponseSchema,
   );
   registry.register('RegistrationProfile', profileResponseSchema);
   const VerifyOutlookResponse = registry.register(
      'VerifyOutlookResponse',
      verifyOutlookResponseSchema,
   );
   const GetMeResponse = registry.register(
      'GetMeResponse',
      getMeResponseSchema,
   );

   registry.registerPath({
      method: 'patch',
      path: '/api/registration/complete-profile',
      tags: [tag],
      summary: 'Complete the authenticated user profile',
      description:
          'Requires authentication. BINUS Computer Science users must provide an @binus.ac.id or @binus.edu email.',
      security: [protectedEndpoint],
      request: {
         body: {
            required: true,
            content: {
               'application/json': {
                  schema: CompleteProfileRequest,
               },
            },
         },
      },
      responses: {
         200: {
            description:
               'Profile updated. A notice is included when verification email sending is attempted.',
            content: {
               'application/json': {
                  schema: CompleteProfileResponse,
               },
            },
         },
         400: {
            description: 'Validation error or invalid Outlook email.',
            content: {
               'application/json': {
                  schema: validationErrorResponseSchema.or(errorResponseSchema),
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

   registry.registerPath({
      method: 'get',
      path: '/api/registration/verify-outlook',
      tags: [tag],
      summary: 'Verify an Outlook email address',
      request: {
         query: z.object({
            token: z.string(),
         }),
      },
      responses: {
         200: {
            description: 'Outlook email verified.',
            content: {
               'application/json': {
                  schema: VerifyOutlookResponse,
               },
            },
         },
         400: {
            description: 'Token is missing, invalid, or expired.',
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
      path: '/api/registration/me',
      tags: [tag],
      summary: 'Get the authenticated user profile',
      description: 'Requires authentication.',
      security: [protectedEndpoint],
      responses: {
         200: {
            description: 'Authenticated user profile.',
            content: {
               'application/json': {
                  schema: GetMeResponse,
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
