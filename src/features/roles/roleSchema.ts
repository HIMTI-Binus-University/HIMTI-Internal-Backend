import { z } from 'zod';

export const CreateRoleSchema = z.object({
   roleName: z.string().max(255),
});

export const UpdateRoleSchema = z.object({
   roleName: z.string().max(255).optional(),
   status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});

export const GetRoleSchema = z.object({
   page: z.coerce.number().min(1).default(1),
   limit: z.coerce.number().min(1).max(100).default(10),
   search: z.string().optional(),
   sort: z.string().default('createdAt:desc'),
   status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});

export const AssignRoleToUserSchema = z.object({
   userId: z.string(),
   roleId: z.string(),
});

export const RemoveRoleFromUserSchema = z.object({
   userId: z.string(),
   roleId: z.string(),
});

export const AssignPermissionToRoleSchema = z.object({
   roleId: z.string(),
   permissionId: z.string(),
});

export const RemovePermissionFromRoleSchema = z.object({
   roleId: z.string(),
   permissionId: z.string(),
});
