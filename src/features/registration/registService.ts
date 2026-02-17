import { User } from '@prisma/client';
import { CompleteProfileRequest } from './registTypes.js';
import { registRepository } from './registRepository.js';
import { auth } from '@/utils/auth.js';

class RegistService {
   async completeProfile(
      payload: CompleteProfileRequest,
      id: string,
      user: typeof auth.$Infer.Session.user,
   ): Promise<User> {
      const profileData = {
         nim: payload.nim,
         graduateBatch: payload.graduateBatch,
         phoneNumber: payload.phoneNumber,
         lineId: payload.lineId,
         updatedBy: user.name,

         university: {
            connect: {
               id: payload.universityId,
            },
         },

         studyProgram: {
            connect: {
               id: payload.studyProgramId,
            },
         },
      };
      return await registRepository.update(id, profileData);
   }
}

export const registService = new RegistService();
