import { z } from 'zod';

export const CreateEventSchema = z.object({
   name: z.string(),
   publicDescription: z.string(),
   coverImageUrl: z.string(),
   status: z.enum(['DRAFT', 'PUBLISHED', 'CLOSED', 'CANCELLED']).optional(),
});

export const GetEventSchema = z.object({
   page: z.coerce.number().min(1).default(1),
   limit: z.coerce.number().min(1).max(100).default(10),
   search: z.string().optional(),
   sort: z.string().default('createdAt:desc'),
   status: z.enum(['DRAFT', 'PUBLISHED', 'CLOSED', 'CANCELLED']).optional(),
   visibility: z.enum(['PUBLIC', 'INTERNAL', 'INVITE_ONLY']).optional(),
});
