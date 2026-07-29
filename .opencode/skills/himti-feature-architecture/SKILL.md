---
name: himti-feature-architecture
description: Use when adding or modifying HIMTI backend feature modules, routes, controllers, services, repositories, schemas, types, or docs under src/features.
---

# HIMTI Feature Architecture

Use this skill for changes to HIMTI backend feature modules under `src/features/**`.

This backend uses Node.js, Express, TypeScript, Prisma, PostgreSQL, Zod, and OpenAPI docs. It follows a feature-based architecture.

## Before Editing

- Inspect a similar existing feature before changing code.
- Follow the nearby feature's naming, imports, function style, and response shape.
- Make the smallest focused change that satisfies the request.
- Do not rename files, move folders, rewrite architecture, or add dependencies unless explicitly asked.

## Feature File Pattern

Feature modules usually follow this structure:

```txt
src/features/<domain>/
  <domain>Routes.ts
  <domain>Controller.ts
  <domain>Service.ts
  <domain>Repository.ts
  <domain>Schema.ts
  <domain>Types.ts
  <domain>Docs.ts
```

Responsibilities:

- `*Routes.ts`: define Express routes and attach middleware.
- `*Controller.ts`: handle request and response logic.
- `*Service.ts`: contain business logic and domain checks.
- `*Repository.ts`: contain Prisma/database access.
- `*Schema.ts`: contain Zod request validation schemas.
- `*Types.ts`: contain shared feature TypeScript types.
- `*Docs.ts`: register OpenAPI documentation for the feature.

## Concrete Feature Example

Use this fictional `announcements` feature as the default shape for a new feature. Adapt model names, permission names, route paths, schemas, and response fields to the actual task. If a similar existing feature differs, follow the existing feature first.

```txt
src/features/announcements/
  announcementRoutes.ts
  announcementController.ts
  announcementService.ts
  announcementRepository.ts
  announcementSchema.ts
  announcementTypes.ts
  announcementDocs.ts
```

### `announcementRoutes.ts`

Routes only define endpoint paths and middleware order. Keep `requireAuth` before `requirePermission`.

```ts
import express from 'express';
import type { Router } from 'express';
import {
   createAnnouncement,
   deleteAnnouncement,
   getAnnouncementById,
   getAnnouncements,
   updateAnnouncement,
} from './announcementController.js';
import { requireAuth } from '@/middleware/authMiddleware.js';
import { requirePermission } from '@/middleware/permissionMiddleware.js';

const router: Router = express.Router();

router.post(
   '/create-announcement',
   requireAuth,
   requirePermission('manage_announcements'),
   createAnnouncement,
);
router.get(
   '/get-list',
   requireAuth,
   requirePermission('manage_announcements'),
   getAnnouncements,
);
router.get(
   '/get-list/:id',
   requireAuth,
   requirePermission('manage_announcements'),
   getAnnouncementById,
);
router.put(
   '/update-announcement/:id',
   requireAuth,
   requirePermission('manage_announcements'),
   updateAnnouncement,
);
router.patch(
   '/delete/:id',
   requireAuth,
   requirePermission('manage_announcements'),
   deleteAnnouncement,
);

export default router;
```

### `announcementSchema.ts`

Schemas validate request bodies and query strings. Keep server-controlled fields such as `createdBy`, `updatedBy`, permissions, and verification flags out of public request schemas unless explicitly required.

```ts
import { z } from 'zod';

export const CreateAnnouncementSchema = z.object({
   title: z.string().trim().min(3).max(255),
   body: z.string().trim().min(1),
   status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});

export const UpdateAnnouncementSchema = z.object({
   title: z.string().trim().min(3).max(255).optional(),
   body: z.string().trim().min(1).optional(),
   status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});

export const DeleteAnnouncementSchema = z.object({});

export const GetAnnouncementSchema = z.object({
   page: z.coerce.number().min(1).default(1),
   limit: z.coerce.number().min(1).max(100).default(10),
   search: z.string().trim().optional(),
   sort: z.string().default('createdAt:desc'),
   status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});
```

### `announcementTypes.ts`

Types derive request types from Zod schemas and define response contracts used by services.

```ts
import { z } from 'zod';
import {
   CreateAnnouncementSchema,
   DeleteAnnouncementSchema,
   GetAnnouncementSchema,
   UpdateAnnouncementSchema,
} from './announcementSchema.js';

export type CreateAnnouncementRequest = z.infer<
   typeof CreateAnnouncementSchema
>;
export type UpdateAnnouncementRequest = z.infer<
   typeof UpdateAnnouncementSchema
>;
export type DeleteAnnouncementRequest = z.infer<
   typeof DeleteAnnouncementSchema
>;
export type GetAnnouncementQuery = z.infer<typeof GetAnnouncementSchema>;

export interface GetAnnouncementResponse {
   data: {
      id: string;
      title: string;
      body: string;
      status: string;
      createdAt: Date;
      updatedAt: Date | null;
   }[];
   meta: {
      page: number;
      limit: number;
      totalRecords: number;
      totalPages: number;
   };
}
```

### `announcementRepository.ts`

Repositories own all Prisma access. Keep filtering, pagination, sorting, and transactions here when possible.

```ts
import { Announcement, Prisma } from '@prisma/client';
import { prisma } from '@/config/prisma.js';
import { parseSort } from '@/utils/sort.js';
import type { GetAnnouncementQuery } from './announcementTypes.js';

const allowedAnnouncementSortFields = [
   'createdAt',
   'title',
   'status',
] as const;

class AnnouncementRepository {
   async create(data: Prisma.AnnouncementCreateInput): Promise<Announcement> {
      return await prisma.announcement.create({ data });
   }

   async update(
      id: string,
      data: Prisma.AnnouncementUpdateInput,
   ): Promise<Announcement> {
      return await prisma.announcement.update({
         where: { id },
         data,
      });
   }

   async findById(id: string): Promise<Announcement | null> {
      return await prisma.announcement.findUnique({
         where: { id },
      });
   }

   async findAll(params: GetAnnouncementQuery) {
      const { page, limit, search, sort, status } = params;
      const where: Prisma.AnnouncementWhereInput = {
         ...(status && { status }),
      };

      if (search) {
         where.OR = [
            { title: { contains: search, mode: 'insensitive' } },
            { body: { contains: search, mode: 'insensitive' } },
         ];
      }

      const sortOption = parseSort(sort, allowedAnnouncementSortFields, {
         field: 'createdAt',
         direction: 'desc',
      });
      const orderBy: Prisma.AnnouncementOrderByWithRelationInput = {
         [sortOption.field]: sortOption.direction,
      };
      const skip = (page - 1) * limit;

      const [data, total] = await prisma.$transaction([
         prisma.announcement.findMany({
            where,
            orderBy,
            skip,
            take: limit,
         }),
         prisma.announcement.count({ where }),
      ]);

      return { data, total };
   }
}

export const announcementRepository = new AnnouncementRepository();
```

### `announcementService.ts`

Services own business logic, not HTTP response formatting. Check existence and domain rules here before calling repository mutations.

```ts
import { Announcement, Prisma } from '@prisma/client';
import { auth } from '@/utils/auth.js';
import { AppError } from '@/utils/appError.js';
import { announcementRepository } from './announcementRepository.js';
import type {
   CreateAnnouncementRequest,
   GetAnnouncementQuery,
   GetAnnouncementResponse,
   UpdateAnnouncementRequest,
} from './announcementTypes.js';

class AnnouncementService {
   async createAnnouncement(
      payload: CreateAnnouncementRequest,
      user: typeof auth.$Infer.Session.user,
   ): Promise<Announcement> {
      const announcementData: Prisma.AnnouncementCreateInput = {
         title: payload.title,
         body: payload.body,
         status: payload.status ?? 'ACTIVE',
         creator: {
            connect: {
               id: user.id,
            },
         },
      };

      return await announcementRepository.create(announcementData);
   }

   async updateAnnouncement(
      payload: UpdateAnnouncementRequest,
      id: string,
      user: typeof auth.$Infer.Session.user,
   ): Promise<Announcement> {
      const announcement = await announcementRepository.findById(id);

      if (!announcement) {
         throw new AppError('Announcement not found', 404);
      }

      const updateData: Prisma.AnnouncementUpdateInput = {
         title: payload.title,
         body: payload.body,
         status: payload.status,
         updater: {
            connect: {
               id: user.id,
            },
         },
      };

      return await announcementRepository.update(id, updateData);
   }

   async deleteAnnouncement(
      id: string,
      user: typeof auth.$Infer.Session.user,
   ): Promise<Announcement> {
      const announcement = await announcementRepository.findById(id);

      if (!announcement) {
         throw new AppError('Announcement not found', 404);
      }

      return await announcementRepository.update(id, {
         status: 'INACTIVE',
         updater: {
            connect: {
               id: user.id,
            },
         },
      });
   }

   async getAnnouncementById(id: string): Promise<Announcement | null> {
      return await announcementRepository.findById(id);
   }

   async getAnnouncements(
      params: GetAnnouncementQuery,
   ): Promise<GetAnnouncementResponse> {
      const { data, total } = await announcementRepository.findAll(params);

      return {
         data,
         meta: {
            page: params.page,
            limit: params.limit,
            totalRecords: total,
            totalPages: Math.ceil(total / params.limit),
         },
      };
   }
}

export const announcementService = new AnnouncementService();
```

### `announcementController.ts`

Controllers validate input, call services, and shape HTTP responses. Keep domain logic in services.

```ts
import { Request, Response } from 'express';
import { announcementService } from './announcementService.js';
import {
   CreateAnnouncementSchema,
   DeleteAnnouncementSchema,
   GetAnnouncementSchema,
   UpdateAnnouncementSchema,
} from './announcementSchema.js';

export const createAnnouncement = async (req: Request, res: Response) => {
   const validation = CreateAnnouncementSchema.safeParse(req.body);

   if (!validation.success) {
      return res.status(400).json({ errors: validation.error.format() });
   }

   const result = await announcementService.createAnnouncement(
      validation.data,
      res.locals.user,
   );

   res.status(200).json({
      msg: 'success',
      data: result,
   });
};

export const updateAnnouncement = async (req: Request, res: Response) => {
   const validation = UpdateAnnouncementSchema.safeParse(req.body);

   if (!validation.success) {
      return res.status(400).json({ errors: validation.error.format() });
   }

   const result = await announcementService.updateAnnouncement(
      validation.data,
      req.params.id as string,
      res.locals.user,
   );

   res.status(200).json({
      msg: 'success',
      data: result,
   });
};

export const deleteAnnouncement = async (req: Request, res: Response) => {
   const validation = DeleteAnnouncementSchema.safeParse(req.body ?? {});

   if (!validation.success) {
      return res.status(400).json({ errors: validation.error.format() });
   }

   const result = await announcementService.deleteAnnouncement(
      req.params.id as string,
      res.locals.user,
   );

   res.status(200).json({
      msg: 'success',
      data: result,
   });
};

export const getAnnouncementById = async (req: Request, res: Response) => {
   const result = await announcementService.getAnnouncementById(
      req.params.id as string,
   );

   if (!result) {
      return res.status(404).json({ msg: 'Announcement not found' });
   }

   res.status(200).json({
      msg: 'success',
      data: result,
   });
};

export const getAnnouncements = async (req: Request, res: Response) => {
   const query = GetAnnouncementSchema.parse(req.query);
   const result = await announcementService.getAnnouncements(query);

   res.status(200).json({
      msg: 'success',
      ...result,
   });
};
```

### `announcementDocs.ts`

Docs register OpenAPI schemas and paths. Keep paths, methods, security, request bodies, and response schemas aligned with routes/controllers.

```ts
import '@/docs/zodOpenApi.js';
import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

const tag = 'Announcements';

const statusSchema = z.enum(['ACTIVE', 'INACTIVE']);
const protectedEndpoint = {
   sessionCookie: [],
};

const errorResponseSchema = z.object({
   msg: z.string(),
});

const validationErrorResponseSchema = z.object({
   errors: z.unknown(),
});

const announcementSchema = z.object({
   id: z.string(),
   title: z.string(),
   body: z.string(),
   status: statusSchema,
   createdAt: z.string().datetime(),
   updatedAt: z.string().datetime().nullable().optional(),
   createdBy: z.string().nullable().optional(),
   updatedBy: z.string().nullable().optional(),
});

const announcementMutationResponseSchema = z.object({
   msg: z.literal('success'),
   data: announcementSchema,
});

const announcementListResponseSchema = z.object({
   msg: z.literal('success'),
   data: z.array(announcementSchema),
   meta: z.object({
      page: z.number(),
      limit: z.number(),
      totalRecords: z.number(),
      totalPages: z.number(),
   }),
});

const createAnnouncementRequestSchema = z.object({
   title: z.string().min(3).max(255),
   body: z.string().min(1),
   status: statusSchema.optional(),
});

export const registerAnnouncementDocs = (registry: OpenAPIRegistry) => {
   const AnnouncementMutationResponse = registry.register(
      'AnnouncementMutationResponse',
      announcementMutationResponseSchema,
   );
   const AnnouncementListResponse = registry.register(
      'AnnouncementListResponse',
      announcementListResponseSchema,
   );
   const CreateAnnouncementRequest = registry.register(
      'CreateAnnouncementRequest',
      createAnnouncementRequestSchema,
   );
   const ErrorResponse = registry.register(
      'AnnouncementErrorResponse',
      errorResponseSchema,
   );
   const ValidationErrorResponse = registry.register(
      'AnnouncementValidationErrorResponse',
      validationErrorResponseSchema,
   );

   registry.registerPath({
      method: 'post',
      path: '/api/announcements/create-announcement',
      tags: [tag],
      summary: 'Create an announcement',
      description: 'Requires authentication and the manage_announcements permission.',
      security: [protectedEndpoint],
      request: {
         body: {
            required: true,
            content: {
               'application/json': {
                  schema: CreateAnnouncementRequest,
               },
            },
         },
      },
      responses: {
         200: {
            description: 'Announcement created.',
            content: {
               'application/json': {
                  schema: AnnouncementMutationResponse,
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
            description: 'Missing manage_announcements permission.',
         },
      },
   });

   registry.registerPath({
      method: 'get',
      path: '/api/announcements/get-list',
      tags: [tag],
      summary: 'List announcements',
      security: [protectedEndpoint],
      request: {
         query: z.object({
            page: z.coerce.number().min(1).default(1),
            limit: z.coerce.number().min(1).max(100).default(10),
            search: z.string().optional(),
            sort: z.string().default('createdAt:desc'),
            status: statusSchema.optional(),
         }),
      },
      responses: {
         200: {
            description: 'Announcements returned.',
            content: {
               'application/json': {
                  schema: AnnouncementListResponse,
               },
            },
         },
         401: {
            description: 'Authentication required.',
         },
         403: {
            description: 'Missing manage_announcements permission.',
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
};
```

### Registering A New Feature

- Mount the route in `src/routes/routes.ts` using the existing route registration style.
- Register docs in `src/docs/openapi.ts` by importing and calling the feature's `register*Docs` function.
- If the feature needs a new database model, use the Prisma migration safety skill and do not create migrations unless explicitly requested.

## Architecture Rules

- Keep Prisma queries inside repository modules.
- Do not put database access directly in routes or controllers unless the existing feature already does so.
- Keep controllers thin; move domain decisions into services.
- Use Zod schemas for request validation.
- Update OpenAPI docs when route contracts, request schemas, or response shapes change.
- Use existing middleware for authentication, authorization, validation, and error handling.
- Do not weaken validation, authentication, authorization, or error handling to make implementation easier.

## Naming And Imports

- Use clear camelCase names for variables and functions.
- Use action-based names such as `createUser`, `getUserById`, `updateUser`, and `deleteUser`.
- Keep filenames aligned with the feature/domain prefix.
- Use TypeScript ES modules.
- This project uses NodeNext-style runtime imports, so include `.js` extensions in relative imports when matching existing code.
- Prefer existing path aliases such as `@/...` when nearby files use them.

## Style

Follow the existing Prettier style:

- single quotes
- semicolons
- trailing commas
- print width 80
- tab width 3

## Validation

`npm test` is currently a placeholder and exits with an error. Do not run it as proof that tests pass.

For feature changes, validate with:

```bash
npm run build
npx eslint src --ext .ts
npx prettier . --check
```

If a validation command cannot be run or fails because of pre-existing issues, report that clearly.
