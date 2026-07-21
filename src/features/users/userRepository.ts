import { Prisma } from '@prisma/client';
import { GetUserSchema } from './userTypes.js';
import { parseSort } from '@/utils/sort.js';
import { prisma } from '@/config/prisma.js';
import { OUTLOOK_VERIFICATION_TOKEN_TTL_MS } from '@/config/verification.js';

const allowedUserSortFields = ['createdAt', 'name', 'email', 'status'] as const;

class UserRepository {
   async update(id: string, data: Prisma.UserUpdateInput) {
      return await prisma.user.update({
         where: { id },
         data,
         select: {
            id: true,
            name: true,
            email: true,
            emailVerified: true,
            outlookEmail: true,
            outlookEmailVerified: true,
            image: true,
            status: true,
            registrationCompletedAt: true,
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
         },
      });
   }

   async findAll(params: GetUserSchema) {
      const { page, limit, search, sort, status } = params;

      const where: Prisma.UserWhereInput = {
         ...(status && { status }),
      };

      if (search) {
         where.OR = [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { nim: { contains: search, mode: 'insensitive' } },
         ];
      }

      const sortOption = parseSort(sort, allowedUserSortFields, {
         field: 'createdAt',
         direction: 'desc',
      });
      const orderBy: Prisma.UserOrderByWithRelationInput = {
         [sortOption.field]: sortOption.direction,
      };

      const skip = (page - 1) * limit;

      const [data, total] = await prisma.$transaction([
         prisma.user.findMany({
            where,
            orderBy,
            skip,
            take: limit,
            select: {
               id: true,
               name: true,
               email: true,
               emailVerified: true,
               outlookEmail: true,
               image: true,
               status: true,
               nim: true,
               universityId: true,
               studyProgramId: true,
               graduateBatch: true,
               phoneNumber: true,
               lineId: true,
               createdAt: true,
               university: { select: { id: true, name: true } },
               studyProgram: { select: { id: true, name: true } },
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
                        },
                     },
                  },
               },
            },
         }),
         prisma.user.count({ where }),
      ]);

      return { data, total };
   }

   async findById(id: string) {
      return await prisma.user.findUnique({
         where: { id },
         select: {
            id: true,
            name: true,
            email: true,
            emailVerified: true,
            outlookEmail: true,
            image: true,
            status: true,
            nim: true,
            universityId: true,
            studyProgramId: true,
            graduateBatch: true,
            phoneNumber: true,
            lineId: true,
            createdAt: true,
            university: { select: { id: true, name: true } },
            studyProgram: { select: { id: true, name: true } },
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
      verifiedOutlookEmail?: string,
   ) {
      return await prisma.user.updateMany({
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
