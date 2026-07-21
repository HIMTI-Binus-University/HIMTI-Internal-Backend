import { prisma } from '@/config/prisma.js';
import type { MembershipUserProfile } from './membershipTypes.js';

class MembershipRepository {
   async findUserProfile(userId: string) {
      return await prisma.user.findUnique({
         where: { id: userId },
         select: {
            registrationCompletedAt: true,
            graduateBatch: true,
            regionId: true,
         },
      });
   }

   async findActivePeriod() {
      return await prisma.membershipPeriod.findFirst({
         where: { isActive: true },
         orderBy: { id: 'asc' },
         select: { id: true, label: true },
      });
   }

   async findResources(periodId: string, user: MembershipUserProfile) {
      const [groups, contacts] = await Promise.all([
         prisma.membershipGroup.findMany({
            where: {
               periodId,
               AND: [
                  {
                     OR: [
                        { graduateBatch: null },
                        { graduateBatch: user.graduateBatch },
                     ],
                  },
                  { OR: [{ regionId: null }, { regionId: user.regionId }] },
               ],
            },
            select: { id: true, title: true, url: true },
            orderBy: [{ title: 'asc' }, { id: 'asc' }],
         }),
         prisma.membershipContact.findMany({
            where: { periodId },
            select: {
               id: true,
               areas: true,
               name: true,
               phoneNumber: true,
               contactUrl: true,
            },
            orderBy: [{ name: 'asc' }, { id: 'asc' }],
         }),
      ]);

      return { groups, contacts };
   }
}

export const membershipRepository = new MembershipRepository();
