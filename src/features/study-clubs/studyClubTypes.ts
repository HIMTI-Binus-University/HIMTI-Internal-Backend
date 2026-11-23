import type { z } from 'zod';
import type {
   CreateStudyClubSchema,
   StudyClubListQuerySchema,
   UpdateStudyClubSchema,
} from './studyClubSchema.js';

export type CreateStudyClub = z.infer<typeof CreateStudyClubSchema>;
export type UpdateStudyClub = z.infer<typeof UpdateStudyClubSchema>;
export type StudyClubListQuery = z.infer<typeof StudyClubListQuerySchema>;
