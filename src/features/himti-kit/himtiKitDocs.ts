import '@/docs/zodOpenApi.js';
import { z } from 'zod';
import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import {
   BulkImportAttendeesSchema,
   BulkImportResourcesSchema,
   BulkImportSoftwareSchema,
   CreateKitResourcesSchema,
   CreateKitSoftwareSchema,
   MajorEnum,
   ResourceParamsSchema,
   ResourceQuerySchema,
   UpdateKitResourcesSchema,
   UpdateKitSoftwareSchema,
   softwareParamsSchema,
   softwareQuerySchema,
} from './himtiKitSchema.js';

const HimtiKitResourceSchema = z.object({
   id: z.string(),
   title: z.string(),
   description: z.string().nullable(),
   downloadUrl: z.string(),
   coverImageUrl: z.string().nullable(),
   majors: z.array(MajorEnum),
   major: MajorEnum.nullable().openapi({
      description: 'First entry of majors. Kept for older clients; use majors.',
   }),
   createdAt: z.string(),
   updatedAt: z.string().nullable(),
});

const HimtiKitSoftwareSchema = z.object({
   id: z.string(),
   name: z.string(),
   description: z.string(),
   downloadUrl: z.string(),
   coverImageUrl: z.string().nullable(),
   createdAt: z.string(),
   updatedAt: z.string().nullable(),
});

const HimtiKitBulkImportResultSchema = z.object({
   totalSubmitted: z.number().int(),
   totalCreated: z.number().int(),
   totalSkipped: z.number().int(),
   skipped: z.array(
      z.object({
         row: z.number().int().openapi({ description: '1-based row in the payload' }),
         key: z.string(),
         reason: z.string(),
      }),
   ),
});

const HimtiKitAttendeeBulkImportResultSchema = z.object({
   totalSubmitted: z.number().int(),
   totalCreated: z.number().int(),
   totalUpdated: z.number().int(),
   totalDuplicatesInPayload: z.number().int(),
});

export const registerHimtiKitDocs = (registry: OpenAPIRegistry) => {
   const resource = registry.register('HimtiKitResource', HimtiKitResourceSchema);
   const software = registry.register('HimtiKitSoftware', HimtiKitSoftwareSchema);
   const bulkResult = registry.register(
      'HimtiKitBulkImportResult',
      HimtiKitBulkImportResultSchema,
   );
   const createResource = registry.register('CreateHimtiKitResourceBody', CreateKitResourcesSchema);
   const updateResource = registry.register('UpdateHimtiKitResourceBody', UpdateKitResourcesSchema);
   const bulkResources = registry.register('BulkImportHimtiKitResourcesBody', BulkImportResourcesSchema);
   const createSoftware = registry.register('CreateHimtiKitSoftwareBody', CreateKitSoftwareSchema);
   const updateSoftware = registry.register('UpdateHimtiKitSoftwareBody', UpdateKitSoftwareSchema);
   const bulkSoftware = registry.register('BulkImportHimtiKitSoftwareBody', BulkImportSoftwareSchema);
   const bulkAttendees = registry.register('BulkImportHimtiKitAttendeesBody', BulkImportAttendeesSchema);

   const json = <T extends z.ZodTypeAny>(schema: T) => ({
      content: { 'application/json': { schema } },
   });
   const body = <T extends z.ZodTypeAny>(schema: T) => ({ body: { required: true, ...json(schema) } });
   const data = <T extends z.ZodTypeAny>(schema: T) => json(z.object({ success: z.boolean(), data: schema }));

   const base = '/api/himti-kit';
   const admin = { tags: ['HIMTI Kit'], security: [{ sessionCookie: [] }] };
   const errors = {
      400: { description: 'Validation error. Bulk imports list one error per row as `resources.<index>.<field>`.' },
      401: { description: 'Authentication required.' },
      403: { description: 'manage_himti_kit permission required.' },
   };

   registry.registerPath({
      tags: ['HIMTI Kit'],
      method: 'get',
      path: `${base}/resources`,
      operationId: 'listHimtiKitResources',
      summary: 'List learning materials (HIMTI Kit session or admin session)',
      request: { query: ResourceQuerySchema },
      responses: { 200: { description: 'Learning materials.', ...data(z.array(resource)) } },
   });
   registry.registerPath({
      ...admin,
      method: 'post',
      path: `${base}/resources`,
      operationId: 'createHimtiKitResource',
      request: body(createResource),
      responses: { ...errors, 201: { description: 'Created.', ...data(resource) } },
   });
   registry.registerPath({
      ...admin,
      method: 'post',
      path: `${base}/resources/bulk-import`,
      operationId: 'bulkImportHimtiKitResources',
      summary: 'Import learning materials in one transaction. Titles that already exist are skipped.',
      request: body(bulkResources),
      responses: { ...errors, 201: { description: 'Import summary.', ...data(bulkResult) } },
   });
   registry.registerPath({
      ...admin,
      method: 'patch',
      path: `${base}/resources/{id}`,
      operationId: 'updateHimtiKitResource',
      request: { params: ResourceParamsSchema, ...body(updateResource) },
      responses: { ...errors, 200: { description: 'Updated.', ...data(resource) }, 404: { description: 'Resource not found.' } },
   });
   registry.registerPath({
      ...admin,
      method: 'delete',
      path: `${base}/resources/{id}`,
      operationId: 'deleteHimtiKitResource',
      request: { params: ResourceParamsSchema },
      responses: { ...errors, 200: { description: 'Deleted.' }, 404: { description: 'Resource not found.' } },
   });

   registry.registerPath({
      tags: ['HIMTI Kit'],
      method: 'get',
      path: `${base}/software`,
      operationId: 'listHimtiKitSoftware',
      summary: 'List software (HIMTI Kit session or admin session)',
      request: { query: softwareQuerySchema },
      responses: { 200: { description: 'Software entries.', ...data(z.array(software)) } },
   });
   registry.registerPath({
      ...admin,
      method: 'post',
      path: `${base}/software`,
      operationId: 'createHimtiKitSoftware',
      request: body(createSoftware),
      responses: { ...errors, 201: { description: 'Created.', ...data(software) } },
   });
   registry.registerPath({
      ...admin,
      method: 'post',
      path: `${base}/software/bulk-import`,
      operationId: 'bulkImportHimtiKitSoftware',
      summary: 'Import software in one transaction. Names that already exist are skipped.',
      request: body(bulkSoftware),
      responses: { ...errors, 201: { description: 'Import summary.', ...data(bulkResult) } },
   });
   registry.registerPath({
      ...admin,
      method: 'patch',
      path: `${base}/software/{id}`,
      operationId: 'updateHimtiKitSoftware',
      request: { params: softwareParamsSchema, ...body(updateSoftware) },
      responses: { ...errors, 200: { description: 'Updated.', ...data(software) }, 404: { description: 'Software not found.' } },
   });
   registry.registerPath({
      ...admin,
      method: 'delete',
      path: `${base}/software/{id}`,
      operationId: 'deleteHimtiKitSoftware',
      request: { params: softwareParamsSchema },
      responses: { ...errors, 200: { description: 'Deleted.' }, 404: { description: 'Software not found.' } },
   });

   registry.registerPath({
      ...admin,
      method: 'post',
      path: `${base}/attendees/bulk-import`,
      operationId: 'bulkImportHimtiKitAttendees',
      summary: 'Upsert TECHNO attendees by NIM',
      request: body(bulkAttendees),
      responses: {
         ...errors,
         201: { description: 'Import summary.', ...data(HimtiKitAttendeeBulkImportResultSchema) },
      },
   });
};
