import { z } from 'zod';

export const CompleteProfileSchema = z.object({
   name: z.string(),
   nim: z.string().optional(),
   universityId: z.string(),
   regionId: z.string().optional(),
   outlookEmail: z.string().optional().or(z.literal('')),
   studyProgramId: z.string(),
   graduateBatch: z.string(),
   phoneNumber: z.string(),
   lineId: z.string(),
   status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
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
   nim: z.string().nullable(),
   universityId: z.string().nullable(),
   studyProgramId: z.string().nullable(),
   regionId: z.string().nullable(),
   graduateBatch: z.string().nullable(),
   phoneNumber: z.string().nullable(),
   lineId: z.string().nullable(),
   university: z.object({ id: z.string(), name: z.string(), shortName: z.string().nullable() }).nullable(),
   studyProgram: z.object({ id: z.string(), name: z.string(), shortName: z.string().nullable() }).nullable(),
   region: z.object({ id: z.string(), name: z.string(), shortName: z.string().nullable() }).nullable(),
   registrationCompleted: z.boolean(),
   createdAt: z.coerce.date(),
   createdBy: z.string().nullable(),
   updatedAt: z.coerce.date(),
   updatedBy: z.string().nullable(),

   roles: z.array(z.string()),
   permissions: z.array(z.string()),
});
