import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import {
   publicCatalogSchema,
   publicErrorSchema,
   publicSummaryParams,
   publicSummarySchema,
} from './publicEducationSchema.js';

export function registerPublicEducationDocs(registry: OpenAPIRegistry) {
   const catalog = registry.register(
      'PublicEducationCatalog',
      publicCatalogSchema,
   );
   const summary = registry.register(
      'PublicEducationSummary',
      publicSummarySchema,
   );
   const error = registry.register('PublicEducationError', publicErrorSchema);
   const errorResponse = (description: string) => ({
      description,
      content: { 'application/json': { schema: error } },
   });
   for (const detail of [false, true]) {
      registry.registerPath({
         method: 'get',
         path: detail ? '/api/public/summaries/{id}' : '/api/public/catalog',
         tags: ['Public Education'],
         summary: detail
            ? 'Read a published summary'
            : 'List public Education resources',
         security: [],
         ...(detail && { request: { params: publicSummaryParams } }),
         responses: {
            200: {
               description: detail
                  ? 'Read-only Tiptap 3 document and metadata'
                  : 'Complete public catalog without document bodies',
               content: {
                  'application/json': { schema: detail ? summary : catalog },
               },
            },
            ...(detail && {
               400: errorResponse('Invalid summary ID'),
               404: errorResponse('Summary does not exist or is not public'),
            }),
            429: errorResponse('Rate limit exceeded'),
            500: errorResponse('Could not load resources'),
         },
      });
   }
}
