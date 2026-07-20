import { Prisma, User } from '@prisma/client';
import { GetUserSchema } from './userTypes.js';
import { parseSort } from '@/utils/sort.js';
import { prisma } from '@/config/prisma.js';

const allowedUserSortFields = ['createdAt', 'name', 'email', 'status'] as const;

class UserRepository {
   async update(id: string, data: Prisma.UserUpdateInput): Promise<User> {
      return await prisma.user.update({
         where: { id },
         data,
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
}

export const userRepository = new UserRepository();
