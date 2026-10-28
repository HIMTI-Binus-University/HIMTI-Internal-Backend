import '@/docs/zodOpenApi.js';
import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import {
   CourseGroupListResponseSchema,
   CourseGroupSingleResponseSchema,
   CreateCourseGroupSchema,
   UpdateCourseGroupSchema,
} from './educationSchema.js';

export const registerEducationDocs = (registry: OpenAPIRegistry) => {
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
      path: '/api/internal/education/course-groups',
      operationId: 'listEducationCourseGroups',
      tags: ['Internal Education'],
      security: [{ sessionCookie: [] }],
      responses: {
         200: {
            description: 'Course groups available to Education.',
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
};
