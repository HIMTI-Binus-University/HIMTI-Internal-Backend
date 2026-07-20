import { z } from 'zod';

const optionalBoolean = z
   .enum(['true', 'false'])
   .transform((value) => value === 'true')
   .optional();

export const ManageRegistrationsQuerySchema = z.object({
   page: z.coerce.number().int().min(1).default(1),
   limit: z.coerce.number().int().min(1).max(100).default(20),
   search: z.string().trim().optional(),
   memberType: z.enum(['STUDENT', 'LECTURER', 'OTHER']).optional(),
   institutionType: z.enum(['BINUS', 'NON_BINUS']).optional(),
   binusRegion: z.string().trim().optional(),
   verification: optionalBoolean,
   status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).optional(),
   completed: optionalBoolean.default(true),
});

export const ManageRegistrationUpdateSchema = z
   .object({
      name: z.string().trim().min(1).max(255).optional(),
      email: z.string().email().max(100).optional(),
      binusEmail: z
         .string()
         .email()
         .max(100)
         .refine((email) => /^[^@]+@binus\.(ac\.id|edu)$/i.test(email), {
            message: 'Use a @binus.ac.id or @binus.edu email',
         })
         .nullable()
         .optional(),
      memberType: z
         .enum(['STUDENT', 'LECTURER', 'OTHER'])
         .nullable()
         .optional(),
      institutionType: z.enum(['BINUS', 'NON_BINUS']).nullable().optional(),
      binusRegionId: z.string().nullable().optional(),
      nim: z.string().max(50).nullable().optional(),
      universityName: z.string().max(255).nullable().optional(),
      studyProgramName: z.string().max(255).nullable().optional(),
      graduateBatch: z.string().max(20).nullable().optional(),
      department: z.string().max(255).nullable().optional(),
      affiliation: z.string().max(255).nullable().optional(),
      phoneNumber: z.string().max(20).nullable().optional(),
      lineId: z.string().max(50).nullable().optional(),
      status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).optional(),
   })
   .strict();
