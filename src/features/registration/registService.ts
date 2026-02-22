import { User } from '@prisma/client';
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

      if (isBinus && isCompSci) {
         if (
            !payload.outlookEmail ||
            !payload.outlookEmail.toLowerCase().endsWith('@binus.ac.id')
         ) {
            throw new Error('You must use your Binusian Outlook Email');
         }
         validOutlookEmail = payload.outlookEmail;
      }

      const profileData = {
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
      const updatedUser = await registRepository.update(id, profileData);

      if (isBinus && isCompSci && validOutlookEmail) {
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
}

export const registService = new RegistService();
