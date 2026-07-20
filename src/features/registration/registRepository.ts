import { Prisma, User } from '@prisma/client';
import { prisma } from '@/config/prisma.js';
import { OUTLOOK_VERIFICATION_TOKEN_TTL_MS } from '@/config/verification.js';

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

   async findRegionById(id: string) {
      return await prisma.region.findFirst({ where: { id } });
   }

   async findOptions() {
      return await prisma.$transaction([
         prisma.university.findMany({ where: { status: 'ACTIVE' }, orderBy: { name: 'asc' }, select: { id: true, name: true, shortName: true } }),
         prisma.studyProgram.findMany({ where: { status: 'ACTIVE' }, orderBy: { name: 'asc' }, select: { id: true, name: true, shortName: true } }),
         prisma.region.findMany({ where: { status: 'ACTIVE' }, orderBy: { name: 'asc' }, select: { id: true, name: true, shortName: true } }),
      ]);
   }

   async verifyOutlook(id: string, email: string, token: string) {
      return await prisma.$transaction(async (tx) => {
         await tx.user.update({
            where: { id },
            data: { outlookEmail: email, outlookEmailVerified: false },
         });
         await tx.verification.deleteMany({
            where: { identifier: { startsWith: `outlook_verify_${id}` } },
         });
         return await tx.verification.create({
            data: {
               identifier: `outlook_verify_${id}:${email}`,
               value: token,
               expiresAt: new Date(Date.now() + OUTLOOK_VERIFICATION_TOKEN_TTL_MS),
            },
         });
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

   async updateVerifStatus(id: string, email: string) {
      return await prisma.user.updateMany({
         where: { id, outlookEmail: email },
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
