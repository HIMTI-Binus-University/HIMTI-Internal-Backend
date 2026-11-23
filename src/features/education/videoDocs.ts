import '@/docs/zodOpenApi.js';
import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import { CreateVideoSchema, SingleVideoResponseSchema, UpdateVideoSchema, VideoListQuerySchema, VideoListResponseSchema } from './videoSchema.js';

export function registerEducationVideoDocs(registry: OpenAPIRegistry) {
   const single = registry.register('EducationVideoSingleResponse', SingleVideoResponseSchema);
   const list = registry.register('EducationVideoListResponse', VideoListResponseSchema);
   const create = registry.register('EducationVideoCreate', CreateVideoSchema);
   const update = registry.register('EducationVideoUpdate', UpdateVideoSchema);
   const security = [{ sessionCookie: [] }];
   const tags = ['Internal Education'];
   const denied = { description: 'Authentication and manage_education permission required' };

   registry.registerPath({
      method: 'get', path: '/api/internal/education/videos', operationId: 'listEducationVideos', tags, security,
      request: { query: VideoListQuerySchema },
      responses: { 200: { description: 'Paginated videos', content: { 'application/json': { schema: list } } }, 403: denied, 503: { description: 'Session integration is not available' } },
   });
   registry.registerPath({
      method: 'post', path: '/api/internal/education/videos', operationId: 'createEducationVideo', tags, security,
      request: { body: { required: true, content: { 'application/json': { schema: create } } } },
      responses: { 201: { description: 'Created draft video', content: { 'application/json': { schema: single } } }, 400: { description: 'Invalid video' }, 403: denied, 404: { description: 'Session not found' }, 503: { description: 'Session integration is not available' } },
   });
   for (const [method, operationId] of [['get', 'getEducationVideo'], ['patch', 'updateEducationVideo'], ['delete', 'deleteEducationVideo']] as const) {
      registry.registerPath({
         method, path: '/api/internal/education/videos/{videoId}', operationId, tags, security,
         request: {
            params: z.object({ videoId: z.string().min(1) }),
            ...(method === 'patch' ? { body: { required: true, content: { 'application/json': { schema: update } } } } : {}),
         },
         responses: {
            ...(method === 'delete' ? { 204: { description: 'Video deleted' } } : { 200: { description: 'Video', content: { 'application/json': { schema: single } } } }),
            400: { description: 'Invalid video' }, 403: denied, 404: { description: 'Video or session not found' }, 409: { description: 'Session no longer available' }, 503: { description: 'Session integration is not available' },
         },
      });
   }
}
