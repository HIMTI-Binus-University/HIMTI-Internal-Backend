import { z } from 'zod';
export const EventGroupBodySchema = z.object({
   name: z.string().trim().min(3).max(255),
   publicDescription: z.string().trim().nullable().optional(),
   internalDescription: z.string().trim().nullable().optional(),
   coverImageUrl: z.string().url().nullable().optional(),
   primaryColor: z.string().max(20).nullable().optional(),
   secondaryColor: z.string().max(20).nullable().optional(),
});
export const EventGroupUpdateSchema = EventGroupBodySchema.partial();
export const EventGroupListSchema = z.object({
   page: z.coerce.number().int().min(1).default(1),
   limit: z.coerce.number().int().min(1).max(100).default(20),
   search: z.string().trim().optional(),
});
export const EventGroupOrganizerSchema = z.object({
   userId: z.string().min(1),
   role: z.enum(['MANAGER', 'ORGANIZER']).default('ORGANIZER'),
});
export const EventGroupOrganizerUpdateSchema = EventGroupOrganizerSchema.pick({
   role: true,
});
