import { MembershipPosition, Prisma } from '@prisma/client';
import { GetUserSchema, UserFilters } from './userTypes.js';
import { parseSort } from '@/utils/sort.js';
import { prisma } from '@/config/prisma.js';
import { OUTLOOK_VERIFICATION_TOKEN_TTL_MS } from '@/config/verification.js';

const allowedUserSortFields = ['createdAt', 'name', 'email', 'status'] as const;

class UserRepository {
   private getWhere(params: UserFilters): Prisma.UserWhereInput {
      const {
         search,
         status,
         memberType,
         institutionType,
         regionId,
         verification,
         completed,
      } = params;
      const where: Prisma.UserWhereInput = {
         ...(status && { status }),
         ...(memberType && { memberType }),
         ...(institutionType && { institutionType }),
         ...(regionId && { regionId }),
         ...(verification !== undefined && {
            outlookEmailVerified: verification,
         }),
         ...(completed !== undefined && {
            registrationCompletedAt: completed ? { not: null } : null,
         }),
      };

      if (search) {
         where.OR = [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { outlookEmail: { contains: search, mode: 'insensitive' } },
            { nim: { contains: search, mode: 'insensitive' } },
            { phoneNumber: { contains: search, mode: 'insensitive' } },
         ];
      }

      return where;
   }

   private readonly adminUserSelect = {
      id: true,
      name: true,
      email: true,
      emailVerified: true,
      outlookEmail: true,
      outlookEmailVerified: true,
      image: true,
      status: true,
      registrationCompletedAt: true,
      memberType: true,
      institutionType: true,
      universityName: true,
      studyProgramName: true,
      department: true,
      affiliation: true,
      nim: true,
      universityId: true,
      studyProgramId: true,
      regionId: true,
      graduateBatch: true,
      phoneNumber: true,
      lineId: true,
      createdAt: true,
      createdBy: true,
      updatedAt: true,
      updatedBy: true,
      university: { select: { id: true, name: true, shortName: true } },
      studyProgram: { select: { id: true, name: true, shortName: true } },
      region: { select: { id: true, name: true, shortName: true } },
   } satisfies Prisma.UserSelect;

   private readonly adminSelect = {
      ...this.adminUserSelect,
      userHasRoles: {
         where: { role: { status: 'ACTIVE' as const } },
         select: {
            role: { select: { id: true, roleName: true, status: true } },
         },
      },
   } satisfies Prisma.UserSelect;

   async update(
      id: string,
      data: Prisma.UserUpdateInput,
      invalidateOutlookVerification = false,
   ) {
      if (!invalidateOutlookVerification) {
         return await prisma.user.update({
            where: { id },
            data,
            select: this.adminUserSelect,
         });
      }

      return await prisma.$transaction(async (tx) => {
         await tx.verification.deleteMany({
            where: { identifier: { startsWith: `outlook_verify_${id}:` } },
         });
         return await tx.user.update({
            where: { id },
            data,
            select: this.adminUserSelect,
         });
      });
   }

   async findAll(params: GetUserSchema, paginate = true) {
      const { page, limit, sort } = params;
      const where = this.getWhere(params);

      const sortOption = parseSort(sort, allowedUserSortFields, {
         field: 'createdAt',
         direction: 'desc',
      });
      const orderBy: Prisma.UserOrderByWithRelationInput = {
         [sortOption.field]: sortOption.direction,
      };

      const [data, total] = await prisma.$transaction([
         prisma.user.findMany({
            where,
            orderBy,
            ...(paginate ? { skip: (page - 1) * limit, take: limit } : {}),
            select: this.adminSelect,
         }),
         prisma.user.count({ where }),
      ]);

      return { data, total };
   }

   async findById(id: string) {
      return await prisma.user.findUnique({
         where: { id },
         select: {
            ...this.adminSelect,
            userHasRoles: {
               where: {
                  role: {
                     status: 'ACTIVE',
                  },
               },
               select: {
                  role: {
                     select: {
                        id: true,
                        roleName: true,
                        status: true,
                        roleHasPermissions: {
                           where: {
                              permission: {
                                 status: 'ACTIVE',
                              },
                           },
                           select: {
                              permission: {
                                 select: {
                                    id: true,
                                    name: true,
                                    status: true,
                                 },
                              },
                           },
                        },
                     },
                  },
               },
            },
         },
      });
   }

   async summarize(params: UserFilters) {
      const where = this.getWhere(params);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [total, registeredToday, unverifiedOutlookEmail, byMemberType] =
         await prisma.$transaction([
            prisma.user.count({ where }),
            prisma.user.count({
               where: {
                  AND: [where, { registrationCompletedAt: { gte: today } }],
               },
            }),
            prisma.user.count({
               where: {
                  AND: [
                     where,
                     { institutionType: 'BINUS', outlookEmailVerified: false },
                  ],
               },
            }),
            prisma.user.groupBy({
               by: ['memberType'],
               where,
               orderBy: { memberType: 'asc' },
               _count: true,
            }),
         ]);

      return {
         total,
         today: registeredToday,
         unverifiedOutlookEmail,
         byMemberType,
      };
   }

   async findCurrentById(id: string) {
      return await prisma.user.findUnique({
         where: { id },
         include: {
            university: { select: { id: true, name: true, shortName: true } },
            studyProgram: { select: { id: true, name: true, shortName: true } },
            region: { select: { id: true, name: true, shortName: true } },
            userHasRoles: {
               include: {
                  role: {
                     select: {
                        roleName: true,
                        roleHasPermissions: {
                           include: {
                              permission: { select: { name: true } },
                           },
                        },
                     },
                  },
               },
            },
         },
      });
   }

   async findActiveUniversity(id: string) {
      return await prisma.university.findFirst({
         where: { id, status: 'ACTIVE' },
      });
   }

   async findActiveStudyProgram(id: string) {
      return await prisma.studyProgram.findFirst({
         where: { id, status: 'ACTIVE' },
      });
   }

   async findActiveRegion(id: string) {
      return await prisma.region.findFirst({ where: { id, status: 'ACTIVE' } });
   }

   async findRegistrationOptions() {
      return await prisma.$transaction([
         prisma.university.findMany({
            where: { status: 'ACTIVE' },
            orderBy: { name: 'asc' },
            select: { id: true, name: true, shortName: true },
         }),
         prisma.studyProgram.findMany({
            where: { status: 'ACTIVE' },
            orderBy: { name: 'asc' },
            select: { id: true, name: true, shortName: true },
         }),
         prisma.region.findMany({
            where: { status: 'ACTIVE' },
            orderBy: { name: 'asc' },
            select: { id: true, name: true, shortName: true },
         }),
      ]);
   }

   async completeProfile(
      id: string,
      data: Prisma.UserUncheckedUpdateManyInput,
      periodId: string,
      membershipPosition: MembershipPosition,
      verifiedOutlookEmail?: string,
   ) {
      return await prisma.$transaction(async (tx) => {
         const periodExists = await tx.membershipPeriod.count({
            where: { id: periodId, isActive: true },
         });
         if (!periodExists) return { count: 0 };

         const result = await tx.user.updateMany({
            where: {
               id,
               registrationCompletedAt: null,
               ...(verifiedOutlookEmail && {
                  outlookEmail: verifiedOutlookEmail,
                  outlookEmailVerified: true,
               }),
            },
            data,
         });
         if (result.count) {
            await tx.userMembershipPeriod.create({
               data: {
                  userId: id,
                  periodId,
                  isCurrent: true,
                  position: membershipPosition,
               },
            });
         }
         return result;
      });
   }

   async reregister(
      id: string,
      data: Prisma.UserUncheckedUpdateManyInput,
      periodId: string,
      membershipPosition: MembershipPosition,
      verifiedOutlookEmail?: string,
   ) {
      return await prisma.$transaction(async (tx) => {
         const periodExists = await tx.membershipPeriod.count({
            where: {
               id: periodId,
               isActive: true,
               registrationOpen: true,
               memberships: { none: { userId: id } },
            },
         });
         if (!periodExists) return { count: 0 };

         const result = await tx.user.updateMany({
            where: {
               id,
               registrationCompletedAt: { not: null },
               ...(verifiedOutlookEmail && {
                  outlookEmail: verifiedOutlookEmail,
                  outlookEmailVerified: true,
               }),
            },
            data,
         });
         if (!result.count) return result;

         await tx.userMembershipPeriod.updateMany({
            where: { userId: id, isCurrent: true },
            data: { isCurrent: false },
         });
         await tx.userMembershipPeriod.create({
            data: {
               userId: id,
               periodId,
               isCurrent: true,
               position: membershipPosition,
            },
         });
         return result;
      });
   }

   async replaceOutlookVerification(id: string, email: string, token: string) {
      return await prisma.$transaction(async (tx) => {
         await tx.verification.deleteMany({
            where: { identifier: { startsWith: `outlook_verify_${id}:` } },
         });
         return await tx.verification.create({
            data: {
               identifier: `outlook_verify_${id}:${email}`,
               value: token,
               expiresAt: new Date(
                  Date.now() + OUTLOOK_VERIFICATION_TOKEN_TTL_MS,
               ),
            },
         });
      });
   }

   async consumeOutlookVerification(token: string) {
      return await prisma.$transaction(async (tx) => {
         const verification = await tx.verification.findFirst({
            where: {
               value: token,
               identifier: { startsWith: 'outlook_verify_' },
            },
         });
         if (!verification || verification.expiresAt < new Date()) return false;

         const separator = verification.identifier.indexOf(':');
         const userId = verification.identifier
            .slice(0, separator)
            .replace('outlook_verify_', '');
         const email = verification.identifier.slice(separator + 1);
         if (separator < 0 || !userId || !email) return false;

         const claimed = await tx.verification.deleteMany({
            where: { id: verification.id, value: token },
         });
         if (claimed.count === 0) return false;

         await tx.user.update({
            where: { id: userId },
            data: { outlookEmail: email, outlookEmailVerified: true },
         });
         return true;
      });
   }
}

export const userRepository = new UserRepository();
