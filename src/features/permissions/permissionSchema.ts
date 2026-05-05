import { z } from 'zod';

export const CreatePermissionSchema = z.object({
   name: z.string(),
});

export const UpdatePermissionSchema = z.object({
   name: z.string().optional(),
   status: z.enum(['ACTIVE', 'INACTIVE']),
});

export const DeletePermissionSchema = z.object({
   name: z.string().optional(),
   status: z.enum(['ACTIVE', 'INACTIVE']),
});

export const GetPermissionSchema = z.object({
   page: z.coerce.number().min(1).default(1),
   limit: z.coerce.number().min(1).max(100).default(10),
   search: z.string().optional(),
   sort: z.string().default('createdAt:desc'),
   status: z.enum(['ACTIVE', 'INACTIVE']),
});
//
