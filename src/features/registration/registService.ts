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
   ): Promise<{ user: User; verificationSent: boolean }> {
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
         name: payload.nim,
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

      // console.log('Email debug:', {
      //    isBinus,
      //    isCompSci,
      //    validOutlookEmail,
      //    outlookEmailVerified: updatedUser.outlookEmailVerified,
      // });

      let verificationSent = false;

      if (
         isBinus &&
         isCompSci &&
         validOutlookEmail &&
         !updatedUser.outlookEmailVerified
      ) {
         const token = crypto.randomBytes(32).toString('hex');
         await registRepository.verifyOutlook(updatedUser.id, token);
         const verifyLink = `${process.env.FRONTEND_URL}/verify-outlook?token=${token}`;
         // console.log(`Link: ${verifyLink}`);
         try {
            await sendOutlookVerificationEmail(validOutlookEmail, verifyLink);
            console.log('Email sent OK');
         } catch (err) {
            console.error('Email failed:', err);
         }
         verificationSent = true;
      }

      return { user: updatedUser, verificationSent };
   }

   async getUserById(id: string) {
      const user = await registRepository.findUserById(id);
      if (!user) return null;

      const roles = user.userHasRoles.map((ur) => ur.role.roleName);

      const permissions = [
         ...new Set(
            user.userHasRoles.flatMap((ur) =>
               ur.role.roleHasPermissions.map((rp) => rp.permission.name),
            ),
         ),
      ];

      const { userHasRoles, ...userData } = user;

      return {
         ...userData,
         roles,
         permissions,
      };
   }
}

export const registService = new RegistService();
