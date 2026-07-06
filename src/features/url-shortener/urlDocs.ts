import '@/docs/zodOpenApi.js';
import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

const tag = 'URL Shortener';

const shortCodeSchema = z
   .string()
   .min(3)
   .regex(/^[a-zA-Z0-9]+$/);

const statusSchema = z.enum(['ACTIVE', 'INACTIVE']);

const errorResponseSchema = z.object({
   status: z.string().optional(),
   msg: z.string(),
});

const validationErrorResponseSchema = z.object({
   errors: z.unknown(),
});

const urlSchema = z.object({
   id: z.string(),
   originalUrl: z.string().url(),
   shortCode: shortCodeSchema,
   expiresAt: z.string().datetime().nullable(),
   status: statusSchema,
   createdAt: z.string().datetime(),
   updatedAt: z.string().datetime().nullable().optional(),
   createdBy: z.string(),
   updatedBy: z.string().nullable().optional(),
});

const urlMutationResponseSchema = z.object({
   msg: z.literal('success'),
   data: urlSchema,
});

const urlListResponseSchema = z.object({
   msg: z.literal('success'),
   data: z.array(urlSchema),
   meta: z.object({
      page: z.number(),
      limit: z.number(),
      totalRecords: z.number(),
      totalPages: z.number(),
   }),
});

const createUrlRequestSchema = z.object({
   originalUrl: z.string().url(),
   shortCode: shortCodeSchema,
   expiresAt: z.string().datetime().nullable().optional(),
});

const updateUrlRequestSchema = z.object({
   originalUrl: z.string().url().optional(),
   shortCode: shortCodeSchema.optional(),
   expiresAt: z.string().datetime().nullable().optional(),
   status: statusSchema.optional(),
});

const protectedEndpoint = {
   sessionCookie: [],
};

export const registerUrlShortenerDocs = (registry: OpenAPIRegistry) => {
   const Url = registry.register('Url', urlSchema);
   const UrlMutationResponse = registry.register(
      'UrlMutationResponse',
      urlMutationResponseSchema,
   );
   const UrlListResponse = registry.register(
      'UrlListResponse',
      urlListResponseSchema,
   );
   const CreateUrlRequest = registry.register(
      'CreateUrlRequest',
      createUrlRequestSchema,
   );
   const UpdateUrlRequest = registry.register(
      'UpdateUrlRequest',
      updateUrlRequestSchema,
   );
   const ErrorResponse = registry.register(
      'ErrorResponse',
      errorResponseSchema,
   );
   const ValidationErrorResponse = registry.register(
      'ValidationErrorResponse',
      validationErrorResponseSchema,
   );

   registry.registerPath({
      method: 'post',
      path: '/api/url/create-url',
      tags: [tag],
      summary: 'Create a short link',
      description: 'Requires authentication and the manage_urls permission.',
      security: [protectedEndpoint],
      request: {
         body: {
            required: true,
            content: {
               'application/json': {
                  schema: CreateUrlRequest,
               },
            },
         },
      },
      responses: {
         200: {
            description: 'Short link created.',
            content: {
               'application/json': {
                  schema: UrlMutationResponse,
               },
            },
         },
         400: {
            description: 'Validation error.',
            content: {
               'application/json': {
                  schema: ValidationErrorResponse,
               },
            },
         },
         401: {
            description: 'Authentication required.',
         },
         403: {
            description: 'Missing manage_urls permission.',
         },
         409: {
            description: 'Short code already exists.',
            content: {
               'application/json': {
                  schema: ErrorResponse,
               },
            },
         },
      },
   });

   registry.registerPath({
      method: 'get',
      path: '/api/url/link/{shortCode}',
      tags: [tag],
      summary: 'Resolve a short link',
      request: {
         params: z.object({
            shortCode: shortCodeSchema,
         }),
      },
      responses: {
         200: {
            description: 'Short link resolved.',
            content: {
               'application/json': {
                  schema: z.object({
                     originalUrl: z.string().url(),
                  }),
               },
            },
         },
         404: {
            description: 'Short link was not found or is inactive.',
            content: {
               'application/json': {
                  schema: ErrorResponse,
               },
            },
         },
         410: {
            description: 'Short link has expired.',
            content: {
               'application/json': {
                  schema: ErrorResponse,
               },
            },
         },
         500: {
            description: 'Unexpected server or database error.',
            content: {
               'application/json': {
                  schema: ErrorResponse,
               },
            },
         },
      },
   });

   registry.registerPath({
      method: 'put',
      path: '/api/url/update-url/{id}',
      tags: [tag],
      summary: 'Update a short link',
      description: 'Requires authentication and the manage_urls permission.',
      security: [protectedEndpoint],
      request: {
         params: z.object({
            id: z.string(),
         }),
         body: {
            required: true,
            content: {
               'application/json': {
                  schema: UpdateUrlRequest,
               },
            },
         },
      },
      responses: {
         200: {
            description: 'Short link updated.',
            content: {
               'application/json': {
                  schema: UrlMutationResponse,
               },
            },
         },
         400: {
            description: 'Validation error.',
            content: {
               'application/json': {
                  schema: ValidationErrorResponse,
               },
            },
         },
         401: {
            description: 'Authentication required.',
         },
         403: {
            description: 'Missing manage_urls permission.',
         },
         404: {
            description: 'Short link record was not found.',
            content: {
               'application/json': {
                  schema: ErrorResponse,
               },
            },
         },
      },
   });

   registry.registerPath({
      method: 'patch',
      path: '/api/url/delete/{id}',
      tags: [tag],
      summary: 'Soft delete a short link',
      description: 'Requires authentication and the manage_urls permission.',
      security: [protectedEndpoint],
      request: {
         params: z.object({
            id: z.string(),
         }),
      },
      responses: {
         200: {
            description: 'Short link soft deleted.',
            content: {
               'application/json': {
                  schema: UrlMutationResponse,
               },
            },
         },
         400: {
            description: 'Validation error.',
            content: {
               'application/json': {
                  schema: ValidationErrorResponse,
               },
            },
         },
         401: {
            description: 'Authentication required.',
         },
         403: {
            description: 'Missing manage_urls permission.',
         },
         404: {
            description: 'Short link record was not found.',
            content: {
               'application/json': {
                  schema: ErrorResponse,
               },
            },
         },
      },
   });

   registry.registerPath({
      method: 'get',
      path: '/api/url/get-list',
      tags: [tag],
      summary: 'List short links',
      description:
         'Requires authentication and the manage_urls permission. Status defaults to ACTIVE; only Admin users may request INACTIVE records.',
      security: [protectedEndpoint],
      request: {
         query: z.object({
            page: z.coerce.number().min(1).optional(),
            limit: z.coerce.number().min(1).max(100).optional(),
            search: z.string().optional(),
            sort: z.string().optional(),
            status: statusSchema.optional(),
         }),
      },
      responses: {
         200: {
            description: 'Short link list.',
            content: {
               'application/json': {
                  schema: UrlListResponse,
               },
            },
         },
         400: {
            description: 'Validation error.',
            content: {
               'application/json': {
                  schema: ValidationErrorResponse,
               },
            },
         },
         401: {
            description: 'Authentication required.',
         },
         403: {
            description: 'Missing manage_urls permission.',
         },
      },
   });

   registry.registerPath({
      method: 'get',
      path: '/api/url/get-list/{id}',
      tags: [tag],
      summary: 'Get a short link by ID',
      description: 'Requires authentication and the manage_urls permission.',
      security: [protectedEndpoint],
      request: {
         params: z.object({
            id: z.string(),
         }),
      },
      responses: {
         200: {
            description: 'Short link record.',
            content: {
               'application/json': {
                  schema: z.object({
                     msg: z.literal('success'),
                     data: Url,
                  }),
               },
            },
         },
         401: {
            description: 'Authentication required.',
         },
         403: {
            description: 'Missing manage_urls permission.',
         },
         404: {
            description: 'Short link record was not found.',
            content: {
               'application/json': {
                  schema: ErrorResponse,
               },
            },
         },
      },
   });
};
