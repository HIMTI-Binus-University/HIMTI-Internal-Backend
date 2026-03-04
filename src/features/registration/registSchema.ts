import { z } from 'zod';

export const CompleteProfileSchema = z.object({
   nim: z.string().optional(),
   universityId: z.string(),
   outlookEmail: z.string().optional().or(z.literal('')),
   studyProgramId: z.string(),
   graduateBatch: z.string(),
   phoneNumber: z.string(),
   lineId: z.string(),
   status: z.enum(['a', 'd']).optional(),
});

export const GetUserSchema = z.object({
   id: z.string(),
   name: z.string(),
   email: z.string().email(),
   emailVerified: z.boolean(),
   outlookEmail: z.string().email().nullable(),
   outlookEmailVerified: z.boolean(),
   image: z.string().url().nullable(),
   status: z.string(),
   nim: z.string(),
   universityId: z.string(),
   studyProgramId: z.string(),
   graduateBatch: z.string(),
   phoneNumber: z.string().nullable(),
   lineId: z.string().nullable(),
   createdAt: z.coerce.date(),
   createdBy: z.string().nullable(),
   updatedAt: z.coerce.date(),
   updatedBy: z.string().nullable(),

   roles: z.array(z.string()),
   permissions: z.array(z.string()),
});
