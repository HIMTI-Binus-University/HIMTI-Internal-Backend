import { z } from 'zod';

export const CompleteProfileSchema = z.object({
   nim: z.string(),
   unversityId: z.string(),
   studyProgramId: z.string(),
   graduateBatch: z.string(),
   phoneNumber: z.string(),
   lineId: z.string(),
   status: z.enum(['a', 'd']).optional(),
});
