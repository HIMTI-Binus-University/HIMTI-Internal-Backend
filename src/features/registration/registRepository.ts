import { PrismaClient, Prisma, User } from '@prisma/client';

const prisma = new PrismaClient();

class RegistRepository {
   async update(id: string, data: Prisma.UserUpdateInput): Promise<User> {
      return await prisma.user.update({
         where: { id },
         data,
      });
   }

   async findUnivById(id: string) {
      return await prisma.university.findFirst({
         where: { id },
      });
   }

   async findStudyProgramById(id: string) {
      return await prisma.studyProgram.findFirst({
         where: { id },
      });
   }

   async createVerification(userId: string, email: string, tokenHash: string) {
      await prisma.binusEmailVerification.updateMany({
         where: { userId, email, usedAt: null },
         data: { usedAt: new Date() },
      });
      return await prisma.binusEmailVerification.create({
         data: {
            userId,
            email,
            tokenHash,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
         },
      });
   }

   async consumeVerification(tokenHash: string) {
      return prisma.$transaction(async (tx) => {
         const verification = await tx.binusEmailVerification.findFirst({
            where: { tokenHash, usedAt: null, expiresAt: { gt: new Date() } },
         });
         if (!verification) return null;
         const user = await tx.user.findUnique({
            where: { id: verification.userId },
            select: { binusEmail: true },
         });
         if (user?.binusEmail !== verification.email) return null;
         const consumed = await tx.binusEmailVerification.updateMany({
            where: { id: verification.id, usedAt: null },
            data: { usedAt: new Date() },
         });
         if (!consumed.count) return null;
         await tx.user.update({
            where: { id: verification.userId },
            data: {
               binusEmailVerified: true,
               binusEmailVerifiedAt: new Date(),
            },
         });
         return verification;
      });
   }

   async findUserById(id: string) {
      return await prisma.user.findUnique({
         where: { id },
         include: {
            university: { select: { id: true, name: true } },
            studyProgram: { select: { id: true, name: true } },
            binusRegion: { select: { id: true, name: true } },
            userHasRoles: {
               where: { role: { status: 'ACTIVE' } },
               include: {
                  role: {
                     select: {
                        roleName: true,
                        roleHasPermissions: {
                           where: { permission: { status: 'ACTIVE' } },
                           include: {
                              permission: {
                                 select: {
                                    name: true,
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

   async findOptions() {
      const [universities, studyPrograms, binusRegions] =
         await prisma.$transaction([
            prisma.university.findMany({
               where: { status: 'ACTIVE' },
               select: { id: true, name: true, shortName: true },
               orderBy: { name: 'asc' },
            }),
            prisma.studyProgram.findMany({
               where: { status: 'ACTIVE' },
               select: { id: true, name: true, shortName: true },
               orderBy: { name: 'asc' },
            }),
            prisma.binusRegion.findMany({
               where: { status: 'ACTIVE' },
               select: { id: true, name: true },
               orderBy: { name: 'asc' },
            }),
         ]);
      return { universities, studyPrograms, binusRegions };
   }
}

export const registRepository = new RegistRepository();
