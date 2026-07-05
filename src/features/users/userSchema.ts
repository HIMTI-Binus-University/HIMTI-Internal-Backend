import { z } from 'zod';

export const UpdateUserSchema = z.object({
   // Identity
   name: z.string().max(255).optional(),
   email: z.string().email().max(100).optional(),
   emailVerified: z.boolean().optional(),
   outlookEmail: z.string().email().max(100).optional().nullable(),
   outlookEmailVerified: z.boolean().optional(),
   image: z.string().optional().nullable(),
   status: z.enum(['ACTIVE', 'INACTIVE']).optional(),

   // Academic
   nim: z.string().max(50).optional().nullable(),
   universityId: z.string().optional().nullable(),
   studyProgramId: z.string().optional().nullable(),
   graduateBatch: z.string().max(20).optional().nullable(),

   // Contact
   phoneNumber: z.string().max(20).optional().nullable(),
   lineId: z.string().max(50).optional().nullable(),
});

export const GetUserSchema = z.object({
   page: z.coerce.number().min(1).default(1),
   limit: z.coerce.number().min(1).max(100).default(10),
   search: z.string().optional(),
   sort: z.string().default('createdAt:desc'),
   status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});
