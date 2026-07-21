import { randomBytes } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { userRepository } from './userRepository.js';
import {
   GetUserSchema,
   UpdateUserRequest,
   CompleteProfileRequest,
   UpdateProfileRequest,
} from './userTypes.js';
import { auth } from '@/utils/auth.js';
import { getAuthorizedStatusFilter } from '@/utils/statusAccess.js';
import { AppError } from '@/utils/appError.js';
import { sendOutlookVerificationEmail } from '@/utils/mailer.js';

class UserService {
   async getUsers(
      params: GetUserSchema,
      user: typeof auth.$Infer.Session.user,
   ) {
      const query = {
         ...params,
         status: this.getAuthorizedStatus(params.status, user),
      };
      const { data, total } = await userRepository.findAll(query);

      return {
         data: data.map(({ userHasRoles, ...user }) => ({
            ...user,
            roles: userHasRoles.map((uhr) => uhr.role),
         })),
         meta: {
            page: query.page,
            limit: query.limit,
            totalRecords: total,
            totalPages: Math.ceil(total / query.limit),
            previousPage: query.page > 1 ? query.page - 1 : null,
            nextPage: query.page * query.limit < total ? query.page + 1 : null,
         },
      };
   }

   async updateUser(
      payload: UpdateUserRequest,
      id: string,
      user: typeof auth.$Infer.Session.user,
   ) {
      const isBinus = payload.institutionType === 'BINUS';
      const isNonBinus = payload.institutionType === 'NON_BINUS';
      const isStudent = payload.memberType === 'STUDENT';
      const isLecturer = payload.memberType === 'LECTURER';
      const isOther = payload.memberType === 'OTHER';
      const updatedUser: Prisma.UserUpdateInput = {
         name: payload.name,
         email: payload.email,
         emailVerified: payload.emailVerified,
         outlookEmail: isNonBinus ? null : payload.outlookEmail,
         outlookEmailVerified:
            payload.outlookEmailVerified ??
            (payload.outlookEmail !== undefined || isNonBinus
               ? false
               : undefined),
         image: payload.image,
         status: payload.status,
         memberType: payload.memberType,
         institutionType: payload.institutionType,
         universityName: isBinus ? null : payload.universityName,
         studyProgramName:
            isBinus || isLecturer || isOther ? null : payload.studyProgramName,
         department: isStudent || isOther ? null : payload.department,
         affiliation: isStudent || isLecturer ? null : payload.affiliation,
         nim: isLecturer || isOther ? null : payload.nim,
         phoneNumber: payload.phoneNumber,
         lineId: payload.lineId,
         graduateBatch:
            isNonBinus || isLecturer || isOther ? null : payload.graduateBatch,
         university: isNonBinus
            ? { disconnect: true }
            : payload.universityId !== undefined
              ? payload.universityId
                 ? { connect: { id: payload.universityId } }
                 : { disconnect: true }
              : undefined,
         studyProgram:
            isNonBinus || isLecturer || isOther
               ? { disconnect: true }
               : payload.studyProgramId !== undefined
                 ? payload.studyProgramId
                    ? { connect: { id: payload.studyProgramId } }
                    : { disconnect: true }
                 : undefined,
         region: isNonBinus
            ? { disconnect: true }
            : payload.regionId !== undefined
              ? payload.regionId
                 ? { connect: { id: payload.regionId } }
                 : { disconnect: true }
              : undefined,
         updatedBy: user.id,
      };
      return await userRepository.update(
         id,
         updatedUser,
         payload.outlookEmail !== undefined || isNonBinus,
      );
   }

   async getUserById(id: string) {
      const user = await userRepository.findById(id);
      if (!user) return null;

      const { userHasRoles, ...rest } = user;

      const roles = userHasRoles.map(({ role }) => ({
         id: role.id,
         roleName: role.roleName,
         status: role.status,
      }));

      // Merge all permissions from all roles, remove the duplicates using id
      const permissionMap = new Map<
         string,
         { id: string; name: string; status: string }
      >();
      for (const { role } of userHasRoles) {
         for (const { permission } of role.roleHasPermissions) {
            if (!permissionMap.has(permission.id)) {
               permissionMap.set(permission.id, permission);
            }
         }
      }

      return {
         ...rest,
         roles,
         permissions: Array.from(permissionMap.values()),
      };
   }

   async getSummary(
      params: GetUserSchema,
      user: typeof auth.$Infer.Session.user,
   ) {
      const result = await userRepository.summarize({
         ...params,
         status: this.getAuthorizedStatus(params.status, user),
      });
      return {
         ...result,
         byMemberType: Object.fromEntries(
            result.byMemberType.map((item) => [
               item.memberType ?? 'UNKNOWN',
               item._count,
            ]),
         ),
      };
   }

   async exportUsers(
      params: GetUserSchema,
      user: typeof auth.$Infer.Session.user,
   ) {
      const query = {
         ...params,
         status: this.getAuthorizedStatus(params.status, user),
      };
      const { data } = await userRepository.findAll(query, false);
      const fields = [
         'id',
         'name',
         'email',
         'emailVerified',
         'outlookEmail',
         'outlookEmailVerified',
         'phoneNumber',
         'memberType',
         'institutionType',
         'regionId',
         'nim',
         'universityName',
         'studyProgramName',
         'graduateBatch',
         'department',
         'affiliation',
         'status',
         'registrationCompletedAt',
         'createdAt',
      ] as const;
      const csv = (value: unknown) =>
         `"${String(value ?? '').replaceAll('"', '""')}"`;
      return [
         fields.join(','),
         ...data.map((record) =>
            fields.map((field) => csv(record[field])).join(','),
         ),
      ].join('\n');
   }

   async resendVerification(id: string) {
      const user = await userRepository.findById(id);
      if (!user) throw new AppError('User not found', 404);
      if (!user.outlookEmail) {
         throw new AppError('User has no Outlook email', 400);
      }
      if (user.outlookEmailVerified) {
         throw new AppError('Outlook email is already verified', 400);
      }

      await this.sendOutlookVerification(id, user.outlookEmail);
   }

   private getAuthorizedStatus(
      status: GetUserSchema['status'],
      user: typeof auth.$Infer.Session.user,
   ) {
      if (status === 'SUSPENDED') {
         getAuthorizedStatusFilter('INACTIVE', user);
         return status;
      }
      return getAuthorizedStatusFilter(status, user);
   }

   async getCurrentUser(id: string) {
      const user = await userRepository.findCurrentById(id);
      if (!user) return null;

      const roles = user.userHasRoles.map(({ role }) => role.roleName);
      const permissions = [
         ...new Set(
            user.userHasRoles.flatMap(({ role }) =>
               role.roleHasPermissions.map(({ permission }) => permission.name),
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
         memberType: user.memberType,
         institutionType: user.institutionType,
         universityName: user.universityName,
         studyProgramName: user.studyProgramName,
         department: user.department,
         affiliation: user.affiliation,
         nim: user.nim,
         universityId: user.universityId,
         studyProgramId: user.studyProgramId,
         regionId: user.regionId,
         graduateBatch: user.graduateBatch,
         phoneNumber: user.phoneNumber,
         lineId: user.lineId,
         university: user.university,
         studyProgram: user.studyProgram,
         region: user.region,
         registrationCompletedAt: user.registrationCompletedAt,
         registrationCompleted: user.registrationCompletedAt !== null,
         createdAt: user.createdAt,
         createdBy: user.createdBy,
         updatedAt: user.updatedAt,
         updatedBy: user.updatedBy,
         roles,
         permissions,
      };
   }

   async updateProfile(payload: UpdateProfileRequest, id: string) {
      const currentUser = await userRepository.findCurrentById(id);
      if (!currentUser) throw new AppError('User not found', 404);
      if (!currentUser.registrationCompletedAt) {
         throw new AppError(
            'Complete registration before editing your profile',
            403,
         );
      }

      await userRepository.update(id, {
         name: payload.name,
         phoneNumber: payload.phoneNumber,
         lineId: payload.lineId || null,
         updatedBy: id,
      });
      return await this.getCurrentUser(id);
   }

   async completeProfile(payload: CompleteProfileRequest, id: string) {
      const currentUser = await userRepository.findCurrentById(id);
      if (!currentUser) throw new AppError('User not found', 404);
      if (currentUser.registrationCompletedAt) {
         throw new AppError('Registration has already been completed', 403);
      }

      if (payload.institutionType === 'BINUS') {
         const [university, region, studyProgram] = await Promise.all([
            userRepository.findActiveUniversity(payload.universityId!),
            userRepository.findActiveRegion(payload.regionId!),
            payload.memberType === 'STUDENT'
               ? userRepository.findActiveStudyProgram(payload.studyProgramId!)
               : Promise.resolve(null),
         ]);
         if (
            !university ||
            (university.shortName?.toUpperCase() !== 'BINUS' &&
               university.name.toUpperCase() !== 'BINUS UNIVERSITY')
         ) {
            throw new AppError('Active BINUS university is required', 400);
         }
         if (!region)
            throw new AppError('Active BINUS region is required', 400);
         if (payload.memberType === 'STUDENT' && !studyProgram) {
            throw new AppError('Active study program is required', 400);
         }
         if (
            !currentUser.outlookEmailVerified ||
            currentUser.outlookEmail?.toLowerCase() !== payload.outlookEmail
         ) {
            throw new AppError(
               'The Outlook email must be verified for the current user',
               400,
            );
         }
      }

      const isBinus = payload.institutionType === 'BINUS';
      const isStudent = payload.memberType === 'STUDENT';
      const result = await userRepository.completeProfile(
         id,
         {
            name: payload.name,
            phoneNumber: payload.phoneNumber,
            lineId: payload.lineId || null,
            memberType: payload.memberType,
            institutionType: payload.institutionType,
            universityId: isBinus ? payload.universityId : null,
            universityName: isBinus ? null : payload.universityName,
            regionId: isBinus ? payload.regionId : null,
            outlookEmail: isBinus ? payload.outlookEmail : null,
            outlookEmailVerified: isBinus,
            studyProgramId:
               isBinus && isStudent ? payload.studyProgramId : null,
            studyProgramName:
               !isBinus && isStudent ? payload.studyProgramName : null,
            nim: isStudent ? payload.nim : null,
            graduateBatch: isBinus && isStudent ? payload.graduateBatch : null,
            department:
               payload.memberType === 'LECTURER' ? payload.department : null,
            affiliation:
               payload.memberType === 'OTHER' ? payload.affiliation : null,
            registrationCompletedAt: new Date(),
            updatedBy: id,
         },
         isBinus ? payload.outlookEmail : undefined,
      );

      if (result.count === 0) {
         const user = await userRepository.findCurrentById(id);
         if (!user) throw new AppError('User not found', 404);
         if (user.registrationCompletedAt) {
            throw new AppError('Registration has already been completed', 403);
         }
         throw new AppError(
            'The Outlook email must be verified for the current user',
            400,
         );
      }
      return await this.getCurrentUser(id);
   }

   async getRegistrationOptions() {
      const [universities, studyPrograms, binusRegions] =
         await userRepository.findRegistrationOptions();
      return { universities, studyPrograms, binusRegions };
   }

   async sendOutlookVerification(id: string, email: string) {
      const user = await userRepository.findCurrentById(id);
      if (!user) throw new AppError('User not found', 404);

      const token = randomBytes(32).toString('hex');
      await userRepository.replaceOutlookVerification(id, email, token);
      const verifyLink = `${process.env.FRONTEND_URL}/verify-outlook?token=${token}`;
      await sendOutlookVerificationEmail(email, verifyLink);
   }

   async verifyOutlookEmail(token: string) {
      const verified = await userRepository.consumeOutlookVerification(token);
      if (!verified) throw new AppError('Link has expired or invalid', 400);
   }
}

export const userService = new UserService();
