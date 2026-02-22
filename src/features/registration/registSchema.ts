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
