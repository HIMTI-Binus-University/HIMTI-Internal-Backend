import { z } from 'zod';

export const CreateEventSchema = z.object({
   name: z.string(),
   publicDescription: z.string(),
   coverImageUrl: z.string(),
   status: z.enum(['DRAFT', 'PUBLISHED', 'CLOSED', 'CANCELLED']).optional(),
});
