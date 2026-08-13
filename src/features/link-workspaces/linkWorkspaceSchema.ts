import { z } from 'zod';

const shortCodeSchema = z
   .string()
   .trim()
   .min(3)
   .max(100)
   .regex(/^[a-zA-Z0-9]+$/, {
      message: 'Short code cannot contain special characters or spaces',
   });

const futureExpirationSchema = z
   .preprocess(
      (value) => (value === null || value === '' ? undefined : value),
      z.coerce.date().optional(),
   )
   .refine((value) => value === undefined || value > new Date(), {
      message: 'Expiration date cannot be in the past',
   });

export const WorkspaceIdSchema = z.object({
   workspaceId: z.string().min(1),
});

export const WorkspaceMemberParamsSchema = WorkspaceIdSchema.extend({
   userId: z.string().min(1),
});

export const WorkspaceLinkParamsSchema = WorkspaceIdSchema.extend({
   linkId: z.string().min(1),
});

export const ListLinkWorkspacesSchema = z.object({
   page: z.coerce.number().int().min(1).default(1),
   limit: z.coerce.number().int().min(1).max(100).default(10),
   search: z.string().trim().optional(),
   status: z.enum(['ACTIVE', 'ARCHIVED']).default('ACTIVE'),
});

export const CreateLinkWorkspaceSchema = z
   .object({
      name: z.string().trim().min(1).max(255),
      description: z.string().trim().max(5000).nullable().optional(),
   })
   .strict();

export const UpdateLinkWorkspaceSchema = z
   .object({
      name: z.string().trim().min(1).max(255).optional(),
      description: z.string().trim().max(5000).nullable().optional(),
   })
   .strict()
   .refine((value) => Object.keys(value).length > 0, {
      message: 'At least one field is required',
   });

export const AddLinkWorkspaceMemberSchema = z
   .object({
      userId: z.string().min(1),
      role: z.enum(['EDITOR', 'VIEWER']),
   })
   .strict();

export const ChangeLinkWorkspaceMemberRoleSchema = z
   .object({
      role: z.enum(['OWNER', 'EDITOR', 'VIEWER']),
   })
   .strict();

export const CreateWorkspaceLinkSchema = z
   .object({
      originalUrl: z.string().url({ message: 'Invalid URL format' }),
      shortCode: shortCodeSchema,
      expiresAt: futureExpirationSchema,
   })
   .strict();

export const AttachWorkspaceLinkSchema = z
   .object({
      urlId: z.string().min(1),
   })
   .strict();

export const UpdateWorkspaceLinkSchema = z
   .object({
      originalUrl: z.string().url({ message: 'Invalid URL format' }).optional(),
      shortCode: shortCodeSchema.optional(),
      expiresAt: futureExpirationSchema,
   })
   .strict()
   .refine((value) => Object.keys(value).length > 0, {
      message: 'At least one field is required',
   });

export const EmptyBodySchema = z.object({}).strict();
