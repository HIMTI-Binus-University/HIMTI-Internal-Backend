import { PrismaClient, Prisma, User } from '@prisma/client';
import { Param } from '@prisma/client/runtime/library';

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

   async verifyOutlook(id: string, token: string) {
      return await prisma.verification.create({
         data: {
            identifier: `outlook_verify_${id}`,
            value: token,
            expiresAt: new Date(Date.now() + 1 * 60 * 60 * 1000),
         },
      });
   }

   async findVerification(token: string) {
      return await prisma.verification.findFirst({
         where: {
            value: token,
            identifier: { startsWith: 'outlook_verify_' },
         },
      });
   }

   async updateVerifStatus(id: string) {
      return await prisma.user.update({
         where: { id },
         data: { outlookEmailVerified: true },
      });
   }

   async deleteToken(id: string) {
      return await prisma.verification.delete({
         where: { id },
      });
   }

   async findUserById(id: string) {
      return await prisma.user.findUnique({
         where: { id },
         include: {
            userHasRoles: {
               include: {
                  role: {
                     select: {
                        roleName: true,
                        roleHasPermissions: {
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
}

export const registRepository = new RegistRepository();
