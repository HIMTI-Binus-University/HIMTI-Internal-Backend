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
         universityId: payload.unversityId,
         studyProgamId: payload.studyProgramId,
         graduateBatch: payload.graduateBatch,
         phoneNumber: payload.phoneNumber,
         lineId: payload.lineId,
         updatedBy: user.name,
      };
      return await registRepository.update(id, profileData);
   }
}

export const registService = new RegistService();
