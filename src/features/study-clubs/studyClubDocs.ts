import '@/docs/zodOpenApi.js';
import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import {
   CreateStudyClubSchema,
   PublicStudyClubQuerySchema,
   PublicStudyClubListResponseSchema,
   StudyClubIdParamSchema,
   StudyClubListQuerySchema,
   StudyClubListResponseSchema,
   StudyClubResponseSchema,
   UpdateStudyClubSchema,
} from './studyClubSchema.js';

export const registerStudyClubDocs = (registry: OpenAPIRegistry) => {
   registry.registerPath({
      method: 'get',
      path: '/api/public/education/sessions',
      operationId: 'listPublicEducationSessions',
      tags: ['Public Education'],
      request: { query: PublicStudyClubQuerySchema },
      responses: {
         200: {
            description: 'Public session details and published recordings.',
            content: {
               'application/json': {
                  schema: PublicStudyClubListResponseSchema,
               },
            },
         },
         400: { description: 'Invalid query' },
      },
   });
   const list = registry.register(
      'StudyClubListResponse',
      StudyClubListResponseSchema,
   );
   const detail = registry.register(
      'StudyClubResponse',
      StudyClubResponseSchema,
   );
   const create = registry.register(
      'CreateStudyClubBody',
      CreateStudyClubSchema,
   );
   const update = registry.register(
      'UpdateStudyClubBody',
      UpdateStudyClubSchema,
   );
   const base = '/api/internal/education/study-clubs';
   const shared = {
      tags: ['Internal Education'],
      security: [{ sessionCookie: [] }],
   };
   const errors = {
      400: { description: 'Invalid input, schedule, course or links.' },
      401: { description: 'Authentication required.' },
      403: { description: 'manage_education permission required.' },
      404: { description: 'Session or course group not found.' },
   };
   registry.registerPath({
      ...shared,
      method: 'get',
      path: base,
      operationId: 'listStudyClubs',
      summary: 'List Study Club and Responsi sessions',
      request: { query: StudyClubListQuerySchema },
      responses: {
         ...errors,
         200: {
            description: 'Filtered, paginated sessions.',
            content: { 'application/json': { schema: list } },
         },
      },
   });
   registry.registerPath({
      ...shared,
      method: 'get',
      path: `${base}/{sessionId}`,
      operationId: 'getStudyClub',
      request: { params: StudyClubIdParamSchema },
      responses: {
         ...errors,
         200: {
            description: 'Session details.',
            content: { 'application/json': { schema: detail } },
         },
      },
   });
   registry.registerPath({
      ...shared,
      method: 'post',
      path: base,
      operationId: 'createStudyClub',
      request: {
         body: {
            required: true,
            content: { 'application/json': { schema: create } },
         },
      },
      responses: {
         ...errors,
         201: {
            description: 'Session created.',
            content: { 'application/json': { schema: detail } },
         },
      },
   });
   registry.registerPath({
      ...shared,
      method: 'patch',
      path: `${base}/{sessionId}`,
      operationId: 'updateStudyClub',
      request: {
         params: StudyClubIdParamSchema,
         body: {
            required: true,
            content: { 'application/json': { schema: update } },
         },
      },
      responses: {
         ...errors,
         200: {
            description: 'Session updated.',
            content: { 'application/json': { schema: detail } },
         },
      },
   });
};
