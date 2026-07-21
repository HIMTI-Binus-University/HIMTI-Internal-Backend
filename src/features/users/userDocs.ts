import '@/docs/zodOpenApi.js';
import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import {
   errorResponseSchema,
   idParamSchema,
   paginationMetaSchema,
   protectedEndpoint,
   statusSchema,
   userStatusSchema,
   validationErrorResponseSchema,
} from '@/docs/commonSchemas.js';
import {
   CompleteProfileSchema,
   GetUserSchema,
   OutlookEmailSchema,
   UpdateProfileSchema,
   UpdateUserSchema,
} from './userSchema.js';

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

const profileRelationSchema = z
   .object({
      id: z.string(),
      name: z.string(),
      shortName: z.string().nullable(),
   })
   .nullable();

const userListItemSchema = z.object({
   id: z.string(),
   name: z.string(),
   email: z.string().email(),
   emailVerified: z.boolean(),
   outlookEmail: z.string().email().nullable(),
   outlookEmailVerified: z.boolean(),
   image: z.string().nullable(),
   status: userStatusSchema,
   registrationCompletedAt: z.string().datetime().nullable(),
   memberType: z.enum(['STUDENT', 'LECTURER', 'OTHER']).nullable(),
   institutionType: z.enum(['BINUS', 'NON_BINUS']).nullable(),
   universityName: z.string().nullable(),
   studyProgramName: z.string().nullable(),
   department: z.string().nullable(),
   affiliation: z.string().nullable(),
   nim: z.string().nullable(),
   universityId: z.string().nullable(),
   studyProgramId: z.string().nullable(),
   regionId: z.string().nullable(),
   graduateBatch: z.string().nullable(),
   phoneNumber: z.string().nullable(),
   lineId: z.string().nullable(),
   createdAt: z.string().datetime(),
   createdBy: z.string().nullable(),
   updatedAt: z.string().datetime().nullable(),
   updatedBy: z.string().nullable(),
   university: profileRelationSchema,
   studyProgram: profileRelationSchema,
   region: profileRelationSchema,
   roles: z.array(userRoleSchema),
});

const userDetailSchema = userListItemSchema.extend({
   permissions: z.array(userPermissionSchema),
});

const fullUserSchema = userListItemSchema.omit({ roles: true });

const userListResponseSchema = z.object({
   msg: z.literal('success'),
   data: z.array(userListItemSchema),
   meta: paginationMetaSchema.extend({
      previousPage: z.number().nullable(),
      nextPage: z.number().nullable(),
   }),
});

const userDetailResponseSchema = z.object({
   msg: z.literal('success'),
   data: userDetailSchema,
});

const userMutationResponseSchema = z.object({
   msg: z.literal('success'),
   data: fullUserSchema,
});

const userSummaryResponseSchema = z.object({
   msg: z.literal('success'),
   data: z.object({
      total: z.number(),
      today: z.number(),
      unverifiedOutlookEmail: z.number(),
      byMemberType: z.record(z.string(), z.number()),
   }),
});

const currentUserSchema = z.object({
   id: z.string(),
   name: z.string(),
   email: z.string().email(),
   emailVerified: z.boolean(),
   outlookEmail: z.string().email().nullable(),
   outlookEmailVerified: z.boolean(),
   image: z.string().nullable(),
   status: userStatusSchema,
   memberType: z.enum(['STUDENT', 'LECTURER', 'OTHER']).nullable(),
   institutionType: z.enum(['BINUS', 'NON_BINUS']).nullable(),
   universityName: z.string().nullable(),
   studyProgramName: z.string().nullable(),
   department: z.string().nullable(),
   affiliation: z.string().nullable(),
   nim: z.string().nullable(),
   universityId: z.string().nullable(),
   studyProgramId: z.string().nullable(),
   regionId: z.string().nullable(),
   graduateBatch: z.string().nullable(),
   phoneNumber: z.string().nullable(),
   lineId: z.string().nullable(),
   university: profileRelationSchema,
   studyProgram: profileRelationSchema,
   region: profileRelationSchema,
   registrationCompletedAt: z.string().datetime().nullable(),
   registrationCompleted: z.boolean(),
   createdAt: z.string().datetime(),
   createdBy: z.string().nullable(),
   updatedAt: z.string().datetime().nullable(),
   updatedBy: z.string().nullable(),
   roles: z.array(z.string()),
   permissions: z.array(z.string()),
   membershipPeriod: z
      .object({ id: z.string(), label: z.string() })
      .nullable(),
   reregistrationPeriod: z
      .object({ id: z.string(), label: z.string() })
      .nullable(),
});

const currentUserResponseSchema = currentUserSchema.extend({
   msg: z.literal('success'),
});

const profileMutationResponseSchema = z.object({
   msg: z.literal('success'),
   data: currentUserSchema,
});

const registrationOptionsResponseSchema = z.object({
   msg: z.literal('success'),
   data: z.object({
      universities: z.array(profileRelationSchema.unwrap()),
      studyPrograms: z.array(profileRelationSchema.unwrap()),
      binusRegions: z.array(profileRelationSchema.unwrap()),
   }),
});

export const registerUserDocs = (registry: OpenAPIRegistry) => {
   const UpdateUserRequest = registry.register(
      'UpdateUserRequest',
      UpdateUserSchema,
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
   const CompleteProfileRequest = registry.register(
      'CompleteProfileRequest',
      CompleteProfileSchema,
   );
   const UpdateProfileRequest = registry.register(
      'UpdateProfileRequest',
      UpdateProfileSchema,
   );
   const CurrentUserResponse = registry.register(
      'CurrentUserResponse',
      currentUserResponseSchema,
   );
   const ProfileMutationResponse = registry.register(
      'ProfileMutationResponse',
      profileMutationResponseSchema,
   );
   const RegistrationOptionsResponse = registry.register(
      'RegistrationOptionsResponse',
      registrationOptionsResponseSchema,
   );

   registry.registerPath({
      method: 'get',
      path: '/api/users',
      tags: [tag],
      summary: 'List users',
      description:
         'Requires manage_users. Status defaults to ACTIVE; only Admin users may request INACTIVE or SUSPENDED records.',
      security: [protectedEndpoint],
      request: {
         query: GetUserSchema,
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
      path: '/api/users/summary',
      tags: [tag],
      summary: 'Summarize users',
      description:
         'Returns filtered totals, registrations today, unverified Outlook addresses, and counts by member type. Uses the same filters and status authorization as the user list.',
      security: [protectedEndpoint],
      request: { query: GetUserSchema },
      responses: {
         200: {
            description: 'User summary.',
            content: {
               'application/json': { schema: userSummaryResponseSchema },
            },
         },
         400: { description: 'Invalid filter.' },
         401: { description: 'Authentication required.' },
         403: { description: 'Missing permission or non-active access.' },
      },
   });

   registry.registerPath({
      method: 'get',
      path: '/api/users/export',
      tags: [tag],
      summary: 'Export users as CSV',
      description:
         'Exports all users matching the same filters and status authorization as the user list. Pagination parameters are ignored.',
      security: [protectedEndpoint],
      request: { query: GetUserSchema },
      responses: {
         200: {
            description: 'CSV user export.',
            content: { 'text/csv': { schema: z.string() } },
         },
         400: { description: 'Invalid filter or sort.' },
         401: { description: 'Authentication required.' },
         403: { description: 'Missing permission or non-active access.' },
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
      method: 'post',
      path: '/api/user/{id}/resend-verification',
      tags: [tag],
      summary: 'Resend a user Outlook verification email',
      description:
         'Requires manage_users. Replaces the pending generic verification token without clearing the stored address or verification flag.',
      security: [protectedEndpoint],
      request: { params: idParamSchema },
      responses: {
         200: {
            description: 'Verification email sent.',
            content: {
               'application/json': {
                  schema: z.object({
                     msg: z.literal('Verification email sent'),
                  }),
               },
            },
         },
         400: { description: 'No Outlook address or already verified.' },
         401: { description: 'Authentication required.' },
         403: { description: 'Missing manage_users permission.' },
         404: { description: 'User not found.' },
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

   registry.registerPath({
      method: 'get',
      path: '/api/user/me',
      tags: [tag],
      summary: 'Get the authenticated user profile',
      security: [protectedEndpoint],
      responses: {
         200: {
            description: 'Authenticated user profile and access grants.',
            content: {
               'application/json': { schema: CurrentUserResponse },
            },
         },
         401: { description: 'Authentication required.' },
         404: {
            description: 'User not found.',
            content: { 'application/json': { schema: errorResponseSchema } },
         },
      },
   });

   registry.registerPath({
      method: 'patch',
      path: '/api/user/me',
      tags: [tag],
      summary: 'Update self-service contact profile',
      description:
         'Updates only name, phone number, and LINE ID after onboarding. Academic and membership path fields are immutable here.',
      security: [protectedEndpoint],
      request: {
         body: {
            required: true,
            content: {
               'application/json': { schema: UpdateProfileRequest },
            },
         },
      },
      responses: {
         200: {
            description: 'Profile updated.',
            content: {
               'application/json': { schema: ProfileMutationResponse },
            },
         },
         400: {
            description: 'Validation error.',
            content: {
               'application/json': { schema: validationErrorResponseSchema },
            },
         },
         401: { description: 'Authentication required.' },
         403: { description: 'Onboarding is not complete.' },
         404: { description: 'User not found.' },
      },
   });

   registry.registerPath({
      method: 'patch',
      path: '/api/user/me/complete-profile',
      tags: [tag],
      summary: 'Complete one-time user onboarding',
      description:
         'Completes one of the six member/institution paths. BINUS paths require active controlled options and the current verified BINUS Outlook address.',
      security: [protectedEndpoint],
      request: {
         body: {
            required: true,
            content: {
               'application/json': { schema: CompleteProfileRequest },
            },
         },
      },
      responses: {
         200: {
            description: 'Onboarding completed.',
            content: {
               'application/json': { schema: ProfileMutationResponse },
            },
         },
         400: {
            description: 'Invalid path data or controlled option.',
            content: {
               'application/json': {
                  schema: validationErrorResponseSchema.or(errorResponseSchema),
               },
            },
         },
         401: { description: 'Authentication required.' },
         403: { description: 'Onboarding was already completed.' },
         404: { description: 'User not found.' },
      },
   });

   registry.registerPath({
      method: 'patch',
      path: '/api/user/me/reregister',
      tags: [tag],
      summary: 'Review the profile and join the open active period',
      description:
         'Uses the onboarding profile shape, preserves prior period history, and requires re-registration to be open.',
      security: [protectedEndpoint],
      request: {
         body: {
            required: true,
            content: {
               'application/json': { schema: CompleteProfileRequest },
            },
         },
      },
      responses: {
         200: {
            description: 'Re-registration completed.',
            content: {
               'application/json': { schema: ProfileMutationResponse },
            },
         },
         400: { description: 'Invalid profile or unverified Outlook email.' },
         401: { description: 'Authentication required.' },
         403: { description: 'Initial registration is incomplete.' },
         409: { description: 'Re-registration is not currently available.' },
      },
   });

   registry.registerPath({
      method: 'get',
      path: '/api/user/registration-options',
      tags: [tag],
      summary: 'List active controlled onboarding options',
      security: [protectedEndpoint],
      responses: {
         200: {
            description: 'Active universities, study programs, and regions.',
            content: {
               'application/json': { schema: RegistrationOptionsResponse },
            },
         },
         401: { description: 'Authentication required.' },
      },
   });

   registry.registerPath({
      method: 'post',
      path: '/api/user/me/binus-email/send-verification',
      tags: [tag],
      summary: 'Send BINUS Outlook email verification',
      description:
         'Replaces the pending token without changing the current Outlook address or verification status.',
      security: [protectedEndpoint],
      request: {
         body: {
            required: true,
            content: { 'application/json': { schema: OutlookEmailSchema } },
         },
      },
      responses: {
         200: {
            description: 'Verification email sent.',
            content: {
               'application/json': {
                  schema: z.object({
                     msg: z.literal('Verification email sent'),
                  }),
               },
            },
         },
         400: { description: 'Invalid BINUS email.' },
         401: { description: 'Authentication required.' },
         404: { description: 'User not found.' },
      },
   });

   registry.registerPath({
      method: 'get',
      path: '/api/user/binus-email/verify',
      tags: [tag],
      summary: 'Consume a BINUS Outlook verification token',
      request: { query: z.object({ token: z.string().min(1) }) },
      responses: {
         200: {
            description: 'Outlook address updated and verified.',
            content: {
               'application/json': {
                  schema: z.object({
                     msg: z.literal('Your Outlook Email has been verified'),
                  }),
               },
            },
         },
         400: {
            description: 'Token is missing, invalid, or expired.',
            content: { 'application/json': { schema: errorResponseSchema } },
         },
      },
   });
};
