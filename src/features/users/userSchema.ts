import { z } from 'zod';

export const UpdateUserSchema = z.object({
   // Identity
   name: z.string().max(255).optional(),
   email: z.string().email().max(100).optional(),
   emailVerified: z.boolean().optional(),
   outlookEmail: z.string().email().max(100).optional().nullable(),
   outlookEmailVerified: z.boolean().optional(),
   image: z.string().optional().nullable(),
   status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).optional(),

   // Membership path
   memberType: z.enum(['STUDENT', 'LECTURER', 'OTHER']).optional().nullable(),
   institutionType: z.enum(['BINUS', 'NON_BINUS']).optional().nullable(),
   universityName: z.string().max(255).optional().nullable(),
   studyProgramName: z.string().max(255).optional().nullable(),
   department: z.string().max(255).optional().nullable(),
   affiliation: z.string().max(255).optional().nullable(),

   // Academic
   nim: z.string().max(50).optional().nullable(),
   universityId: z.string().optional().nullable(),
   studyProgramId: z.string().optional().nullable(),
   regionId: z.string().optional().nullable(),
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
   status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).optional(),
   memberType: z.enum(['STUDENT', 'LECTURER', 'OTHER']).optional(),
   institutionType: z.enum(['BINUS', 'NON_BINUS']).optional(),
   regionId: z.string().optional(),
   verification: z.stringbool().optional(),
   completed: z.stringbool().optional(),
});

export const UserFilterSchema = GetUserSchema.omit({ page: true, limit: true });

const requiredText = (max: number) => z.string().trim().min(1).max(max);
const optionalText = (max: number) => requiredText(max).optional();

export const CompleteProfileSchema = z
   .object({
      name: requiredText(255),
      phoneNumber: requiredText(20),
      lineId: z.string().trim().max(50).optional(),
      memberType: z.enum(['STUDENT', 'LECTURER', 'OTHER']),
      institutionType: z.enum(['BINUS', 'NON_BINUS']),
      universityId: optionalText(255),
      universityName: optionalText(255),
      regionId: optionalText(255),
      outlookEmail: z.string().trim().toLowerCase().email().max(100).optional(),
      studyProgramId: optionalText(255),
      studyProgramName: optionalText(255),
      nim: optionalText(50),
      graduateBatch: optionalText(20),
      department: optionalText(255),
      affiliation: optionalText(255),
   })
   .strict()
   .superRefine((data, ctx) => {
      const required = (field: keyof typeof data) => {
         if (!data[field]) {
            ctx.addIssue({
               code: 'custom',
               path: [field],
               message: 'Required for the selected membership path',
            });
         }
      };

      if (data.institutionType === 'BINUS') {
         required('universityId');
         required('regionId');
         required('outlookEmail');
         if (
            data.outlookEmail &&
            !data.outlookEmail.endsWith('@binus.ac.id') &&
            !data.outlookEmail.endsWith('@binus.edu')
         ) {
            ctx.addIssue({
               code: 'custom',
               path: ['outlookEmail'],
               message: 'Email must use @binus.ac.id or @binus.edu',
            });
         }
      } else {
         required('universityName');
      }

      if (data.memberType === 'STUDENT') {
         required('nim');
         if (data.institutionType === 'BINUS') {
            required('studyProgramId');
            required('graduateBatch');
         } else {
            required('studyProgramName');
         }
      } else if (data.memberType === 'LECTURER') {
         required('department');
      } else {
         required('affiliation');
      }
   });

export const UpdateProfileSchema = z
   .object({
      name: requiredText(255),
      phoneNumber: requiredText(20),
      lineId: z.string().trim().max(50),
   })
   .strict();

const relationSchema = z
   .object({
      id: z.string(),
      name: z.string(),
      shortName: z.string().nullable(),
   })
   .nullable();

export const CurrentUserSchema = z.object({
   id: z.string(),
   name: z.string(),
   email: z.string().email(),
   emailVerified: z.boolean(),
   outlookEmail: z.string().email().nullable(),
   outlookEmailVerified: z.boolean(),
   image: z.string().nullable(),
   status: z.string(),
   memberType: z.enum(['STUDENT', 'LECTURER', 'OTHER']).nullable(),
   institutionType: z.enum(['BINUS', 'NON_BINUS']).nullable(),
   universityName: z.string().nullable(),
   studyProgramName: z.string().nullable(),
   department: z.string().nullable(),
   affiliation: z.string().nullable(),
   nim: z.string().nullable(),
   universityId: z.string().nullable(),
   studyProgramId: z.string().nullable(),
   regionId: z.string().nullable(),
   graduateBatch: z.string().nullable(),
   phoneNumber: z.string().nullable(),
   lineId: z.string().nullable(),
   university: relationSchema,
   studyProgram: relationSchema,
   region: relationSchema,
   registrationCompleted: z.boolean(),
   registrationCompletedAt: z.coerce.date().nullable(),
   createdAt: z.coerce.date(),
   createdBy: z.string().nullable(),
   updatedAt: z.coerce.date().nullable(),
   updatedBy: z.string().nullable(),
   roles: z.array(z.string()),
   permissions: z.array(z.string()),
});

export const OutlookEmailSchema = z.object({
   email: z
      .string()
      .trim()
      .toLowerCase()
      .email()
      .refine(
         (email) =>
            email.endsWith('@binus.ac.id') || email.endsWith('@binus.edu'),
         'Email must use @binus.ac.id or @binus.edu',
      ),
});

export const OutlookVerificationQuerySchema = z.object({
   token: z.string().min(1),
});
