import { User, Prisma } from '@prisma/client';
import { CompleteProfileRequest } from './registTypes.js';
import { registRepository } from './registRepository.js';
import { auth } from '@/utils/auth.js';
import crypto from 'crypto';
import { sendOutlookVerificationEmail } from '@/utils/mailer.js';

class RegistService {
   async completeProfile(
      payload: CompleteProfileRequest,
      id: string,
      user: typeof auth.$Infer.Session.user,
   ): Promise<User> {
      const currentUser = await registRepository.findUserById(id);
      const university = await registRepository.findUnivById(
         payload.universityId,
      );
      const studyProgram = await registRepository.findStudyProgramById(
         payload.studyProgramId,
      );

      // Binusian?
      const isBinus = university?.name
         .toLowerCase()
         .includes('binus university');

      // CompSci?
      const isCompSci = studyProgram?.name
         .toLowerCase()
         .includes('computer science');

      let validOutlookEmail = null;
      let isEmailChanged = false;

      if (isBinus && isCompSci) {
         if (
            !payload.outlookEmail ||
            !payload.outlookEmail.toLowerCase().endsWith('@binus.ac.id')
         ) {
            throw new Error('You must use your Binusian Outlook Email');
         }
         validOutlookEmail = payload.outlookEmail;
         isEmailChanged = validOutlookEmail !== currentUser?.outlookEmail;
      }

      const profileData: Prisma.UserUpdateInput = {
         nim: payload.nim,
         graduateBatch: payload.graduateBatch,
         phoneNumber: payload.phoneNumber,
         outlookEmail: validOutlookEmail,
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

      if (isEmailChanged) {
         profileData.outlookEmailVerified = false;
      }

      const updatedUser = await registRepository.update(id, profileData);

      if (
         isBinus &&
         isCompSci &&
         validOutlookEmail &&
         !updatedUser.outlookEmailVerified
      ) {
         const token = crypto.randomBytes(32).toString('hex');
         await registRepository.verifyOutlook(updatedUser.id, token);

         const verifyLink = `${process.env.FRONTEND_URL}/verify-outlook?token=${token}`;
         console.log(`Link: ${verifyLink}`);

         sendOutlookVerificationEmail(validOutlookEmail, verifyLink).catch(
            (err) => {
               console.error('Failed sending Resend email in background:', err);
            },
         );
      }

      return updatedUser;
   }

   async getUserById(id: string) {
      const user = await registRepository.findUserById(id);
      if (!user) return null;

      const roles = user.userHasRoles.map((ur) => ur.role.roleName);

      // Ambil semua 'name' dari permission trus buang duplikatnya
      const permissions = [
         ...new Set(
            user.userHasRoles.flatMap((ur) =>
               ur.role.roleHasPermissions.map((rp) => rp.permission.name),
            ),
         ),
      ];

      // 5. Destructuring untuk membuang properti 'userHasRoles' yang kotor,
      //    dan mengambil sisa data user (id, name, email, dll) ke dalam 'userData'
      const { userHasRoles, ...userData } = user;

      // 6. Return data bersih yang sudah digabungkan
      return {
         ...userData,
         roles,
         permissions,
      };
   }
}

export const registService = new RegistService();
