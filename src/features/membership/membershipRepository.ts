import { prisma } from '@/config/prisma.js';
import type {
   CreatePeriodRequest,
   CreateResourceRequest,
   UpdateResourceRequest,
} from './membershipTypes.js';

const periodSummarySelect = { id: true, label: true } as const;
const resourceSelect = {
   id: true,
   periodId: true,
   title: true,
   description: true,
   url: true,
   position: true,
   region: { select: { id: true, name: true, shortName: true } },
} as const;

class MembershipRepository {
   async findUserMembership(userId: string) {
      return await prisma.user.findUnique({
         where: { id: userId },
         select: {
            registrationCompletedAt: true,
            membershipPeriods: {
               where: { isCurrent: true },
               take: 1,
               select: { period: { select: periodSummarySelect } },
            },
         },
      });
   }

   async findStatus(userId: string) {
      const [current, active] = await Promise.all([
         prisma.userMembershipPeriod.findFirst({
            where: { userId, isCurrent: true },
            select: { period: { select: periodSummarySelect } },
         }),
         prisma.membershipPeriod.findFirst({
            where: { isActive: true },
            select: {
               ...periodSummarySelect,
               registrationOpen: true,
               memberships: {
                  where: { userId },
                  take: 1,
                  select: { userId: true },
               },
            },
         }),
      ]);
      const activePeriod = active
         ? { id: active.id, label: active.label }
         : null;
      return {
         currentPeriod: current?.period ?? null,
         activePeriod,
         availablePeriod:
            active?.registrationOpen && !active.memberships.length
               ? activePeriod
               : null,
      };
   }

   async findResources(periodId: string) {
      return await prisma.membershipResource.findMany({
         where: { periodId },
         select: resourceSelect,
         orderBy: [{ position: 'asc' }, { id: 'asc' }],
      });
   }

   async listPeriods() {
      return await prisma.membershipPeriod.findMany({
         select: {
            id: true,
            label: true,
            isActive: true,
            registrationOpen: true,
            _count: { select: { memberships: true, resources: true } },
         },
         orderBy: [{ isActive: 'desc' }, { id: 'desc' }],
      });
   }

   async findPeriod(id: string) {
      return await prisma.membershipPeriod.findUnique({
         where: { id },
         include: { _count: { select: { memberships: true, resources: true } } },
      });
   }

   async createPeriod(data: CreatePeriodRequest) {
      return await prisma.membershipPeriod.create({ data });
   }

   async updatePeriod(id: string, label: string) {
      return await prisma.membershipPeriod.update({ where: { id }, data: { label } });
   }

   async deletePeriod(id: string) {
      return await prisma.membershipPeriod.delete({ where: { id } });
   }

   async activatePeriod(id: string) {
      return await prisma.$transaction(async (tx) => {
         await tx.membershipPeriod.updateMany({
            where: { isActive: true, id: { not: id } },
            data: { isActive: false, registrationOpen: false },
         });
         return await tx.membershipPeriod.update({
            where: { id },
            data: { isActive: true },
         });
      });
   }

   async setRegistrationOpen(id: string, open: boolean) {
      return await prisma.membershipPeriod.update({
         where: { id },
         data: { registrationOpen: open },
      });
   }

   async findRegion(id: string) {
      return await prisma.region.findFirst({ where: { id, status: 'ACTIVE' } });
   }

   async createResource(periodId: string, data: CreateResourceRequest) {
      const aggregate = await prisma.membershipResource.aggregate({
         where: { periodId },
         _max: { position: true },
      });
      return await prisma.membershipResource.create({
         data: {
            periodId,
            ...data,
            position: (aggregate._max.position ?? -1) + 1,
         },
         select: resourceSelect,
      });
   }

   async findResource(id: string) {
      return await prisma.membershipResource.findUnique({ where: { id } });
   }

   async updateResource(id: string, data: UpdateResourceRequest) {
      return await prisma.membershipResource.update({
         where: { id },
         data,
         select: resourceSelect,
      });
   }

   async deleteResource(id: string) {
      return await prisma.membershipResource.delete({ where: { id } });
   }

   async reorderResources(periodId: string, resourceIds: string[]) {
      return await prisma.$transaction(
         resourceIds.map((id, position) =>
            prisma.membershipResource.update({
               where: { id, periodId },
               data: { position },
            }),
         ),
      );
   }
}

export const membershipRepository = new MembershipRepository();
