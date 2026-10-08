import '@/docs/zodOpenApi.js';
import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import {
   CreateEventPackageSchema,
   UpdateEventPackageSchema,
} from './eventPackageSchema.js';

const eventPackageSchema = z.object({
   id: z.string(),
   eventId: z.string(),
   code: z.string(),
   name: z.string(),
   description: z.string().nullable(),
   status: z.enum(['DRAFT', 'ACTIVE', 'INACTIVE']),
   seatCount: z.number().int(),
   currency: z.string().length(3),
   priceMinor: z
      .string()
      .regex(/^\d+$/)
      .describe(
         'Whole-order price in minor units. Serialized from Prisma BigInt.',
      ),
   salesStartAt: z.string().datetime().nullable(),
   salesEndAt: z.string().datetime().nullable(),
   createdAt: z.string().datetime(),
   updatedAt: z.string().datetime().nullable(),
});
const json = (schema: z.ZodType) => ({
   'application/json': { schema },
});

export const registerEventPackageDocs = (registry: OpenAPIRegistry) => {
   const EventPackage = registry.register('EventPackage', eventPackageSchema);
   const EventPackageItemResponse = registry.register(
      'EventPackageItemResponse',
      z.object({ data: EventPackage }),
   );
   const EventPackageListResponse = registry.register(
      'EventPackageListResponse',
      z.object({ data: z.array(EventPackage) }),
   );
   const security = [{ sessionCookie: [] }];
   const errors = {
      400: { description: 'Invalid package.' },
      401: { description: 'Authentication required.' },
      403: { description: 'Permission and Event scope required.' },
      404: { description: 'Event or package not found.' },
      409: { description: 'Commercial package terms are immutable.' },
   };
   const itemSuccess = {
      200: {
         description: 'Event package returned.',
         content: json(EventPackageItemResponse),
      },
      ...errors,
   };
   const params = z.object({ eventId: z.string(), packageId: z.string() });

   registry.registerPath({
      method: 'get',
      path: '/api/internal/events/{eventId}/packages',
      operationId: 'listEventPackages',
      tags: ['Event Packages'],
      security,
      request: { params: params.pick({ eventId: true }) },
      responses: {
         200: {
            description: 'Event packages returned in creation order.',
            content: json(EventPackageListResponse),
         },
         ...errors,
      },
   });
   registry.registerPath({
      method: 'post',
      path: '/api/internal/events/{eventId}/packages',
      operationId: 'createEventPackage',
      tags: ['Event Packages'],
      security,
      request: {
         params: params.pick({ eventId: true }),
         body: {
            required: true,
            content: json(CreateEventPackageSchema),
         },
      },
      responses: {
         201: {
            description: 'Draft Event package created.',
            content: json(EventPackageItemResponse),
         },
         ...errors,
      },
   });
   registry.registerPath({
      method: 'get',
      path: '/api/internal/events/{eventId}/packages/{packageId}',
      operationId: 'getEventPackage',
      tags: ['Event Packages'],
      security,
      request: { params },
      responses: itemSuccess,
   });
   registry.registerPath({
      method: 'patch',
      path: '/api/internal/events/{eventId}/packages/{packageId}',
      operationId: 'updateEventPackage',
      tags: ['Event Packages'],
      security,
      request: {
         params,
         body: {
            required: true,
            content: json(UpdateEventPackageSchema),
         },
      },
      responses: itemSuccess,
   });
   for (const action of ['activate', 'deactivate'] as const)
      registry.registerPath({
         method: 'post',
         path: `/api/internal/events/{eventId}/packages/{packageId}/${action}`,
         operationId: `${action}EventPackage`,
         tags: ['Event Packages'],
         security,
         request: { params },
         responses: itemSuccess,
      });
};
