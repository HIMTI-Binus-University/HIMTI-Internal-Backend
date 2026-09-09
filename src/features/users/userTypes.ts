import {
   CompleteProfileSchema,
   GetUserSchema,
   UpdateProfileSchema,
   UpdateUserSchema,
   UserFilterSchema,
} from './userSchema.js';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';

export type GetUserSchema = z.infer<typeof GetUserSchema>;
export type UpdateUserRequest = z.infer<typeof UpdateUserSchema>;
export type CompleteProfileRequest = z.infer<typeof CompleteProfileSchema>;
export type UpdateProfileRequest = z.infer<typeof UpdateProfileSchema>;
export type UserFilters = z.infer<typeof UserFilterSchema>;

export const buildProfileUpdateData = (
   payload: UpdateProfileRequest,
   userId: string,
): Prisma.UserUncheckedUpdateManyInput => {
   const isBinus = payload.institutionType === 'BINUS';

   return {
      name: payload.name,
      phoneNumber: payload.phoneNumber,
      lineId: payload.lineId || null,
      institutionType: payload.institutionType,
      universityId: isBinus ? payload.universityId : null,
      studyProgramId: isBinus ? payload.studyProgramId : null,
      regionId: isBinus ? payload.regionId : null,
      nim: isBinus ? payload.nim : null,
      universityName: isBinus ? null : payload.universityName,
      studyProgramName: isBinus ? null : payload.studyProgramName,
      graduateBatch: isBinus ? undefined : null,
      outlookEmail: isBinus ? undefined : null,
      outlookEmailVerified: isBinus ? undefined : false,
      updatedBy: userId,
   };
};
