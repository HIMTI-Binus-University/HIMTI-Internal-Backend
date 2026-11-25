import '@/docs/zodOpenApi.js';
import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import {
   CourseGroupListResponseSchema,
   CourseGroupSingleResponseSchema,
   CreateCourseGroupSchema,
   CreateResponsiSchema,
   ResponsiDetailResponseSchema,
   ResponsiListResponseSchema,
   ResponsiListQuerySchema,
   ResponsiVersionListResponseSchema,
   UpdateCourseGroupSchema,
   UpdateResponsiSchema,
} from './educationSchema.js';

export const registerEducationDocs = (registry: OpenAPIRegistry) => {
   // Course Groups Responses and Bodies
   const CourseGroupListResponse = registry.register(
      'EducationCourseGroupListResponse',
      CourseGroupListResponseSchema,
   );
   const CourseGroupSingleResponse = registry.register(
      'EducationCourseGroupSingleResponse',
      CourseGroupSingleResponseSchema,
   );
   const CreateCourseGroupBody = registry.register(
      'EducationCreateCourseGroupBody',
      CreateCourseGroupSchema,
   );
   const UpdateCourseGroupBody = registry.register(
      'EducationUpdateCourseGroupBody',
      UpdateCourseGroupSchema,
   );

   registry.registerPath({
      method: 'get',
      path: '/api/internal/education/responsi/editor-candidates',
      operationId: 'listEducationResponsiEditorCandidates',
      tags: ['Internal Education'],
      security: [{ sessionCookie: [] }],
      request: { query: z.object({ search: z.string().min(2).max(100) }) },
      responses: {
         200: {
            description: 'Active education editors matching the search',
            content: {
               'application/json': {
                  schema: z.object({
                     data: z.array(
                        z.object({ id: z.string(), name: z.string() }),
                     ),
                  }),
               },
            },
         },
         400: { description: 'Invalid search' },
         403: { description: 'manage_education required' },
      },
   });

   // Responsi Responses and Bodies
   const ResponsiListResponse = registry.register(
      'EducationResponsiListResponse',
      ResponsiListResponseSchema,
   );
   const ResponsiDetailResponse = registry.register(
      'EducationResponsiDetailResponse',
      ResponsiDetailResponseSchema,
   );
   const CreateResponsiBody = registry.register(
      'EducationCreateResponsiBody',
      CreateResponsiSchema,
   );
   const UpdateResponsiBody = registry.register(
      'EducationUpdateResponsiBody',
      UpdateResponsiSchema,
   );
   const ResponsiVersionListResponse = registry.register(
      'EducationResponsiVersionListResponse',
      ResponsiVersionListResponseSchema,
   );

   // Course Groups Paths
   registry.registerPath({
      method: 'get',
      path: '/api/internal/education/course-groups',
      operationId: 'listEducationCourseGroups',
      tags: ['Internal Education'],
      security: [{ sessionCookie: [] }],
      responses: {
         200: {
            description:
               'Course groups with totals for all linked summaries, sessions, and videos.',
            content: {
               'application/json': { schema: CourseGroupListResponse },
            },
         },
         403: { description: 'manage_education permission required' },
      },
   });

   registry.registerPath({
      method: 'post',
      path: '/api/internal/education/course-groups',
      operationId: 'createEducationCourseGroup',
      tags: ['Internal Education'],
      security: [{ sessionCookie: [] }],
      request: {
         body: {
            content: {
               'application/json': { schema: CreateCourseGroupBody },
            },
         },
      },
      responses: {
         201: {
            description: 'Course group created successfully.',
            content: {
               'application/json': { schema: CourseGroupSingleResponse },
            },
         },
         400: { description: 'Validation error' },
         403: { description: 'manage_education permission required' },
         409: { description: 'Course with this name or code already exists' },
      },
   });

   registry.registerPath({
      method: 'get',
      path: '/api/internal/education/course-groups/{courseId}',
      operationId: 'getEducationCourseGroup',
      tags: ['Internal Education'],
      security: [{ sessionCookie: [] }],
      request: {
         params: z.object({
            courseId: z.string(),
         }),
      },
      responses: {
         200: {
            description: 'Course group retrieved successfully.',
            content: {
               'application/json': { schema: CourseGroupSingleResponse },
            },
         },
         403: { description: 'manage_education permission required' },
         404: { description: 'Course group not found' },
      },
   });

   registry.registerPath({
      method: 'patch',
      path: '/api/internal/education/course-groups/{courseId}',
      operationId: 'updateEducationCourseGroup',
      tags: ['Internal Education'],
      security: [{ sessionCookie: [] }],
      request: {
         params: z.object({
            courseId: z.string(),
         }),
         body: {
            content: {
               'application/json': { schema: UpdateCourseGroupBody },
            },
         },
      },
      responses: {
         200: {
            description: 'Course group updated successfully.',
            content: {
               'application/json': { schema: CourseGroupSingleResponse },
            },
         },
         400: { description: 'Validation error' },
         403: { description: 'manage_education permission required' },
         404: { description: 'Course group not found' },
         409: { description: 'Course with this name or code already exists' },
      },
   });

   // Responsi Paths
   registry.registerPath({
      method: 'get',
      path: '/api/internal/education/responsi',
      operationId: 'listEducationResponsies',
      tags: ['Internal Education'],
      security: [{ sessionCookie: [] }],
      request: { query: ResponsiListQuerySchema },
      responses: {
         200: {
            description:
               'List of Responsi and Study Club summaries, filtered before pagination.',
            content: {
               'application/json': { schema: ResponsiListResponse },
            },
         },
         403: { description: 'manage_education permission required' },
      },
   });

   registry.registerPath({
      method: 'post',
      path: '/api/internal/education/responsi',
      operationId: 'createEducationResponsi',
      tags: ['Internal Education'],
      security: [{ sessionCookie: [] }],
      request: {
         body: {
            content: {
               'application/json': { schema: CreateResponsiBody },
            },
         },
      },
      responses: {
         201: {
            description: 'Responsi created successfully.',
            content: {
               'application/json': { schema: ResponsiDetailResponse },
            },
         },
         400: { description: 'Validation error' },
         403: { description: 'manage_education permission required' },
      },
   });

   registry.registerPath({
      method: 'get',
      path: '/api/internal/education/responsi/{responsiId}',
      operationId: 'getEducationResponsi',
      tags: ['Internal Education'],
      security: [{ sessionCookie: [] }],
      request: {
         params: z.object({
            responsiId: z.string(),
         }),
      },
      responses: {
         200: {
            description: 'Responsi details with Markdown content.',
            content: {
               'application/json': { schema: ResponsiDetailResponse },
            },
         },
         403: { description: 'manage_education permission required' },
         404: { description: 'Responsi not found' },
      },
   });

   registry.registerPath({
      method: 'patch',
      path: '/api/internal/education/responsi/{responsiId}',
      operationId: 'updateEducationResponsi',
      tags: ['Internal Education'],
      security: [{ sessionCookie: [] }],
      request: {
         params: z.object({
            responsiId: z.string(),
         }),
         body: {
            content: {
               'application/json': { schema: UpdateResponsiBody },
            },
         },
      },
      responses: {
         200: {
            description: 'Responsi updated successfully.',
            content: {
               'application/json': { schema: ResponsiDetailResponse },
            },
         },
         400: { description: 'Validation error' },
         403: { description: 'manage_education permission required' },
         404: { description: 'Responsi not found' },
         409: {
            description: 'Review required, unsaved edits, or concurrent update',
         },
      },
   });

   registry.registerPath({
      method: 'delete',
      path: '/api/internal/education/responsi/{responsiId}',
      operationId: 'deleteEducationResponsi',
      tags: ['Internal Education'],
      security: [{ sessionCookie: [] }],
      request: {
         params: z.object({
            responsiId: z.string(),
         }),
      },
      responses: {
         200: {
            description: 'Responsi deleted successfully.',
            content: {
               'application/json': {
                  schema: z.object({ message: z.string() }),
               },
            },
         },
         403: { description: 'manage_education permission required' },
         404: { description: 'Responsi not found' },
      },
   });

   registry.registerPath({
      method: 'get',
      path: '/api/internal/education/responsi/{responsiId}/versions',
      operationId: 'listEducationResponsiVersions',
      tags: ['Internal Education'],
      security: [{ sessionCookie: [] }],
      request: {
         params: z.object({
            responsiId: z.string(),
         }),
      },
      responses: {
         200: {
            description: 'Version history snapshots for Responsi.',
            content: {
               'application/json': { schema: ResponsiVersionListResponse },
            },
         },
         403: { description: 'manage_education permission required' },
         404: { description: 'Responsi not found' },
      },
   });
   registry.registerPath({
      method: 'post',
      path: '/api/internal/education/responsi/{responsiId}/versions/{versionId}/restore',
      operationId: 'restoreEducationResponsiVersion',
      tags: ['Internal Education'],
      security: [{ sessionCookie: [] }],
      request: {
         params: z.object({ responsiId: z.string(), versionId: z.string() }),
      },
      responses: {
         200: {
            description: 'Published Markdown restored into review.',
            content: { 'application/json': { schema: ResponsiDetailResponse } },
         },
         403: { description: 'manage_education permission required' },
         404: { description: 'Published summary version not found' },
         409: { description: 'Concurrent update' },
      },
   });
   registry.registerPath({
      method: 'post',
      path: '/api/internal/education/responsi/{responsiId}/approve',
      operationId: 'approveEducationResponsi',
      tags: ['Internal Education'],
      security: [{ sessionCookie: [] }],
      request: {
         params: z.object({ responsiId: z.string() }),
      },
      responses: {
         200: {
            description: 'Summary updated',
            content: { 'application/json': { schema: ResponsiDetailResponse } },
         },
         400: { description: 'Invalid input' },
         403: {
            description:
               'review_education_summary or manage_education required',
         },
         404: { description: 'Summary not found' },
         409: { description: 'Invalid status or concurrent update' },
      },
   });

   registry.registerPath({
      method: 'put',
      path: '/api/internal/education/responsi/{responsiId}/editors',
      operationId: 'assignEducationResponsiEditors',
      tags: ['Internal Education'],
      security: [{ sessionCookie: [] }],
      request: {
         params: z.object({ responsiId: z.string() }),
         body: {
            required: true,
            content: {
               'application/json': {
                  schema: z.object({ editorIds: z.array(z.string()).max(100) }),
               },
            },
         },
      },
      responses: {
         200: {
            description: 'Summary updated',
            content: { 'application/json': { schema: ResponsiDetailResponse } },
         },
         400: { description: 'Invalid input' },
         403: { description: 'manage_education required' },
         404: { description: 'Summary not found' },
         409: { description: 'Invalid status or concurrent update' },
      },
   });
};
