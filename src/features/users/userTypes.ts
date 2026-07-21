import {
   CompleteProfileSchema,
   GetUserSchema,
   UpdateProfileSchema,
   UpdateUserSchema,
} from './userSchema.js';
import { z } from 'zod';

export type GetUserSchema = z.infer<typeof GetUserSchema>;
export type UpdateUserRequest = z.infer<typeof UpdateUserSchema>;
export type CompleteProfileRequest = z.infer<typeof CompleteProfileSchema>;
export type UpdateProfileRequest = z.infer<typeof UpdateProfileSchema>;

export interface GetUserResponse {
   data: {
      id: string;
      name: string;
      email: string;
      emailVerified: boolean;
      outlookEmail: string | null;
      image: string | null;
      status: string;
      nim: string | null;
      universityId: string | null;
      studyProgramId: string | null;
      graduateBatch: string | null;
      phoneNumber: string | null;
      lineId: string | null;
      createdAt: Date;
      university: { id: string; name: string } | null;
      studyProgram: { id: string; name: string } | null;
      roles: {
         id: string;
         roleName: string;
         status: string;
      }[];
   }[];
   meta: {
      page: number;
      limit: number;
      totalRecords: number;
      totalPages: number;
   };
}

export interface GetUserByIdResponse {
   data: {
      id: string;
      name: string;
      email: string;
      emailVerified: boolean;
      outlookEmail: string | null;
      image: string | null;
      status: string;
      nim: string | null;
      universityId: string | null;
      studyProgramId: string | null;
      graduateBatch: string | null;
      phoneNumber: string | null;
      lineId: string | null;
      createdAt: Date;
      university: { id: string; name: string } | null;
      studyProgram: { id: string; name: string } | null;
      roles: {
         id: string;
         roleName: string;
         status: string;
      }[];
   };
}
