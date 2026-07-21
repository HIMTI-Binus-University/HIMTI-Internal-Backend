import { User, Prisma } from '@prisma/client';
import {
   CompleteProfileRequest,
   UpdateProfileRequest,
} from './registTypes.js';
import { registRepository } from './registRepository.js';
import { auth } from '@/utils/auth.js';
import crypto from 'crypto';
import { sendOutlookVerificationEmail } from '@/utils/mailer.js';
import { AppError } from '@/utils/appError.js';

class RegistService {
   async updateProfile(payload: UpdateProfileRequest, id: string) {
      const currentUser = await registRepository.findUserById(id);

      if (!currentUser?.registrationCompletedAt) {
         throw new AppError('Complete registration before editing your profile', 403);
      }

      await registRepository.update(id, {
         name: payload.name,
         phoneNumber: payload.phoneNumber,
         lineId: payload.lineId || null,
         updatedBy: id,
      });

      return await this.getUserById(id);
   }

   async completeProfile(
      payload: CompleteProfileRequest,
      id: string,
      user: typeof auth.$Infer.Session.user,
   ): Promise<{ user: User; verificationSent: boolean }> {
      const currentUser = await registRepository.findUserById(id);
      if (!currentUser) {
         throw new AppError('User not found', 404);
      }
      if (currentUser.registrationCompletedAt) {
         throw new AppError('Registration has already been completed', 403);
      }
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

      let validOutlookEmail = payload.outlookEmail || null;
      let isEmailChanged = false;

      if (isBinus && isCompSci) {
         if (
            !payload.outlookEmail ||
            !['@binus.ac.id', '@binus.edu'].some((domain) =>
               payload.outlookEmail?.toLowerCase().endsWith(domain),
            )
         ) {
            throw new AppError('You must use your Binusian Outlook Email', 400);
         }
         validOutlookEmail = payload.outlookEmail.toLowerCase();
         isEmailChanged = validOutlookEmail !== currentUser?.outlookEmail;
      }

      const profileData: Prisma.UserUpdateInput = {
         name: payload.name,
         registrationCompletedAt:
            currentUser?.registrationCompletedAt ?? new Date(),
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
         region: payload.regionId
            ? { connect: { id: payload.regionId } }
            : { disconnect: true },
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
         await registRepository.verifyOutlook(
            updatedUser.id,
            validOutlookEmail,
            token,
         );

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

      return {
         id: user.id,
         name: user.name,
         email: user.email,
         emailVerified: user.emailVerified,
         outlookEmail: user.outlookEmail,
         outlookEmailVerified: user.outlookEmailVerified,
         image: user.image,
         status: user.status,
         nim: user.nim,
         universityId: user.universityId,
         studyProgramId: user.studyProgramId,
         regionId: user.regionId,
         university: user.university,
         studyProgram: user.studyProgram,
         region: user.region,
         graduateBatch: user.graduateBatch,
         phoneNumber: user.phoneNumber,
         lineId: user.lineId,
         createdAt: user.createdAt,
         createdBy: user.createdBy,
         updatedAt: user.updatedAt,
         updatedBy: user.updatedBy,
         registrationCompletedAt: user.registrationCompletedAt,
         roles,
         permissions,
         registrationCompleted: user.registrationCompletedAt !== null,
      };
   }
}

export const registService = new RegistService();
