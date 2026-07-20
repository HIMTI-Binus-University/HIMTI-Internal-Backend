import { PrismaClient, Prisma, User } from '@prisma/client';
import { ManageRegistrationsQuery } from './userTypes.js';

const prisma = new PrismaClient();

class UserRepository {
   private registrationWhere(params: ManageRegistrationsQuery) {
      const where: Prisma.UserWhereInput = {
         memberType: params.memberType,
         institutionType: params.institutionType,
         binusRegion: params.binusRegion
            ? { name: { equals: params.binusRegion, mode: 'insensitive' } }
            : undefined,
         binusEmailVerified: params.verification,
         status: params.status,
         registrationCompletedAt: params.completed ? { not: null } : null,
      };
      if (params.search) {
         where.OR = ['name', 'email', 'binusEmail', 'nim', 'phoneNumber'].map(
            (field) => ({
               [field]: { contains: params.search, mode: 'insensitive' },
            }),
         );
      }
      return where;
   }

   private readonly registrationSelect = {
      id: true,
      name: true,
      email: true,
      emailVerified: true,
      binusEmail: true,
      binusEmailVerified: true,
      binusEmailVerifiedAt: true,
      memberType: true,
      institutionType: true,
      binusRegionId: true,
      binusRegion: { select: { id: true, name: true } },
      nim: true,
      universityName: true,
      studyProgramName: true,
      graduateBatch: true,
      department: true,
      affiliation: true,
      phoneNumber: true,
      lineId: true,
      status: true,
      registrationCompletedAt: true,
      createdAt: true,
      updatedAt: true,
      userHasRoles: {
         select: {
            role: { select: { id: true, roleName: true, status: true } },
         },
      },
   } satisfies Prisma.UserSelect;

   async findRegistrations(params: ManageRegistrationsQuery, paginate = true) {
      const where = this.registrationWhere(params);
      const [data, total] = await prisma.$transaction([
         prisma.user.findMany({
            where,
            select: this.registrationSelect,
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
            ...(paginate && {
               skip: (params.page - 1) * params.limit,
               take: params.limit,
            }),
         }),
         prisma.user.count({ where }),
      ]);
      return { data, total };
   }

   async findRegistrationById(id: string) {
      return prisma.user.findUnique({
         where: { id },
         select: this.registrationSelect,
      });
   }

   async registrationSummary() {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const [total, registeredToday, unverifiedBinus, byMemberType] =
         await prisma.$transaction([
            prisma.user.count({
               where: { registrationCompletedAt: { not: null } },
            }),
            prisma.user.count({
               where: { registrationCompletedAt: { gte: today } },
            }),
            prisma.user.count({
               where: {
                  institutionType: 'BINUS',
                  binusEmailVerified: false,
                  registrationCompletedAt: { not: null },
               },
            }),
            prisma.user.groupBy({
               by: ['memberType'],
               where: { registrationCompletedAt: { not: null } },
               orderBy: { memberType: 'asc' },
               _count: true,
            }),
         ]);
      return {
         total,
         today: registeredToday,
         unverifiedBinus,
         byMemberType: Object.fromEntries(
            byMemberType
               .filter((item) => item.memberType)
               .map((item) => [item.memberType, item._count]),
         ),
      };
   }

   async update(id: string, data: Prisma.UserUpdateInput): Promise<User> {
      return await prisma.user.update({
         where: { id },
         data,
      });
   }
}

export const userRepository = new UserRepository();
