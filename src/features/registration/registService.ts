import { Prisma } from '@prisma/client';
import { CompleteProfileRequest } from './registTypes.js';
import { registRepository } from './registRepository.js';
import { auth } from '@/utils/auth.js';
import crypto from 'crypto';
import { sendBinusVerificationEmail } from '@/utils/mailer.js';

class RegistService {
   async completeProfile(
      payload: CompleteProfileRequest,
      id: string,
      user: typeof auth.$Infer.Session.user,
   ) {
      const currentUser = await registRepository.findUserById(id);
      if (!currentUser) throw new Error('User not found');
      // Binusian?
      const isBinus = payload.institutionType === 'BINUS';

      // CompSci?
      let validBinusEmail = null;

      if (isBinus) {
         if (
            !payload.binusEmail ||
            !/^[^@]+@binus\.(ac\.id|edu)$/i.test(payload.binusEmail)
         ) {
            throw new Error('You must use a @binus.ac.id or @binus.edu email');
         }
         validBinusEmail = payload.binusEmail.toLowerCase();
         if (
            !currentUser.binusEmailVerified ||
            currentUser.binusEmail?.toLowerCase() !== validBinusEmail
         ) {
            throw new Error('Verify this BINUS email before continuing');
         }
      }

      const profileData: Prisma.UserUpdateInput = {
         name: payload.name,
         nim: payload.nim ?? null,
         graduateBatch: payload.graduateBatch ?? null,
         phoneNumber: payload.phoneNumber,
         binusEmail: validBinusEmail,
         memberType: payload.memberType,
         institutionType: payload.institutionType,
         binusRegion: payload.binusRegionId
            ? { connect: { id: payload.binusRegionId } }
            : { disconnect: true },
         universityName: payload.universityName ?? null,
         studyProgramName: payload.studyProgramName ?? null,
         department: payload.department ?? null,
         affiliation: payload.affiliation ?? null,
         lineId: payload.lineId,
         updatedBy: user.id,

         university: payload.universityId
            ? { connect: { id: payload.universityId } }
            : { disconnect: true },
         studyProgram: payload.studyProgramId
            ? { connect: { id: payload.studyProgramId } }
            : { disconnect: true },
      };

      if (payload.institutionType !== 'BINUS') {
         profileData.binusEmail = null;
         profileData.binusEmailVerified = false;
         profileData.binusEmailVerifiedAt = null;
         profileData.binusRegion = { disconnect: true };
      }

      profileData.registrationCompletedAt = new Date();
      await registRepository.update(id, profileData);
      return this.getUserById(id);
   }

   async sendVerification(id: string, email: string) {
      const normalizedEmail = email.toLowerCase();
      if (!/^[^@]+@binus\.(ac\.id|edu)$/.test(normalizedEmail))
         throw new Error('Invalid BINUS email domain');
      const user = await registRepository.findUserById(id);
      if (!user) throw new Error('User not found');
      if (
         user.binusEmail?.toLowerCase() !== normalizedEmail ||
         user.binusEmailVerified
      ) {
         await registRepository.update(id, {
            binusEmail: normalizedEmail,
            binusEmailVerified: false,
            binusEmailVerifiedAt: null,
         });
      }
      const token = crypto.randomBytes(32).toString('hex');
      await registRepository.createVerification(
         id,
         normalizedEmail,
         crypto.createHash('sha256').update(token).digest('hex'),
      );
      await sendBinusVerificationEmail(
         normalizedEmail,
         `${process.env.FRONTEND_URL}/verify-outlook?token=${token}`,
      );
   }

   async verify(token: string) {
      return registRepository.consumeVerification(
         crypto.createHash('sha256').update(token).digest('hex'),
      );
   }

   getOptions() {
      return registRepository.findOptions();
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
      void userHasRoles;

      return {
         ...userData,
         registrationCompleted: userData.registrationCompletedAt !== null,
         roles,
         permissions,
      };
   }
}

export const registService = new RegistService();
