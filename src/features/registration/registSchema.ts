import { z } from 'zod';

export const CompleteProfileSchema = z
   .object({
      name: z.string().trim().min(1).max(255),
      nim: z.string().trim().max(50).optional(),
      universityId: z.string().min(1).optional(),
      universityName: z.string().trim().max(255).optional(),
      studyProgramId: z.string().min(1).optional(),
      studyProgramName: z.string().trim().max(255).optional(),
      graduateBatch: z.string().trim().max(20).optional(),
      department: z.string().trim().max(255).optional(),
      affiliation: z.string().trim().max(255).optional(),
      phoneNumber: z.string().trim().max(20),
       lineId: z.string().trim().max(50).optional(),
      memberType: z.enum(['STUDENT', 'LECTURER', 'OTHER']),
      institutionType: z.enum(['BINUS', 'NON_BINUS']),
      binusRegionId: z.string().min(1).optional(),
      binusEmail: z
         .string()
         .trim()
         .email()
         .max(100)
         .optional()
         .or(z.literal('')),
   })
   .superRefine((data, ctx) => {
      const require = (field: keyof typeof data) => {
         if (!data[field])
            ctx.addIssue({
               code: 'custom',
               path: [field],
               message: 'Required for this registration path',
            });
      };
      if (data.institutionType === 'BINUS') {
         require('binusRegionId');
         require('binusEmail');
          if (data.memberType === 'STUDENT') {
             require('nim');
             require('studyProgramId');
             require('graduateBatch');
         } else if (data.memberType === 'LECTURER') require('department');
         else require('affiliation');
      } else if (data.memberType === 'STUDENT') {
         require('universityName');
         require('studyProgramName');
         require('nim');
      } else if (data.memberType === 'LECTURER') {
         require('universityName');
         require('department');
      } else require('affiliation');
   });

export const SendVerificationSchema = z.object({
   email: z.string().trim().email().max(100),
});

export const GetUserSchema = z.object({
   id: z.string(),
   name: z.string(),
   email: z.string().email(),
   emailVerified: z.boolean(),
   binusEmail: z.string().email().nullable(),
   binusEmailVerified: z.boolean(),
   binusEmailVerifiedAt: z.coerce.date().nullable(),
   outlookEmail: z.string().email().nullable(),
   outlookEmailVerified: z.boolean(),
   image: z.string().url().nullable(),
   status: z.string(),
   nim: z.string().nullable(),
   universityId: z.string().nullable(),
   studyProgramId: z.string().nullable(),
   graduateBatch: z.string().nullable(),
   phoneNumber: z.string().nullable(),
   lineId: z.string().nullable(),
   memberType: z.string().nullable(),
   institutionType: z.string().nullable(),
   binusRegionId: z.string().nullable(),
   universityName: z.string().nullable(),
   studyProgramName: z.string().nullable(),
   department: z.string().nullable(),
   affiliation: z.string().nullable(),
    registrationCompletedAt: z.coerce.date().nullable(),
    registrationCompleted: z.boolean(),
    university: z
       .object({ id: z.string(), name: z.string() })
       .nullable(),
    studyProgram: z
       .object({ id: z.string(), name: z.string() })
       .nullable(),
    binusRegion: z
       .object({ id: z.string(), name: z.string() })
       .nullable(),
   createdAt: z.coerce.date(),
   createdBy: z.string().nullable(),
   updatedAt: z.coerce.date().nullable(),
   updatedBy: z.string().nullable(),

   roles: z.array(z.string()),
   permissions: z.array(z.string()),
});
