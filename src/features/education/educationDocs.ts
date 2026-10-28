import '@/docs/zodOpenApi.js';
import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { CourseGroupListResponseSchema } from './educationSchema.js';

export const registerEducationDocs = (registry: OpenAPIRegistry) => {
   const CourseGroupListResponse = registry.register(
      'EducationCourseGroupListResponse',
      CourseGroupListResponseSchema,
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
};
