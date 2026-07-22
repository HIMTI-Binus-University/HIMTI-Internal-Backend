import type { Prisma } from '@prisma/client';
import { AppError } from '@/utils/appError.js';
import { membershipRepository } from './membershipRepository.js';
import type {
   CreatePeriodRequest,
   CreateResourceRequest,
   MembershipResources,
   UpdateResourceRequest,
} from './membershipTypes.js';

class MembershipService {
   async getStatus(userId: string) {
      return await membershipRepository.findStatus(userId);
   }

   async getMembershipResources(userId: string): Promise<MembershipResources> {
      const user = await membershipRepository.findUserMembership(userId);
      if (!user?.registrationCompletedAt) {
         throw new AppError('registration_required', 403);
      }
      const period = user.membershipPeriods[0]?.period;
      if (!period) throw new AppError('membership_period_not_assigned', 404);

      return {
         period,
         resources: await membershipRepository.findResources(period.id),
      };
   }

   async listPeriods() {
      return await membershipRepository.listPeriods();
   }

   async createPeriod(data: CreatePeriodRequest) {
      const periodData: Prisma.MembershipPeriodCreateInput = {
         id: data.id,
         label: data.label,
      };
      return await membershipRepository.createPeriod(periodData);
   }

   async updatePeriod(id: string, label: string) {
      await this.requirePeriod(id);
      return await membershipRepository.updatePeriod(id, label);
   }

   async deletePeriod(id: string) {
      const period = await this.requirePeriod(id);
      if (period.isActive)
         throw new AppError('Active period cannot be deleted', 409);
      if (period._count.memberships || period._count.resources) {
         throw new AppError('Only empty periods can be deleted', 409);
      }
      return await membershipRepository.deletePeriod(id);
   }

   async activatePeriod(id: string) {
      await this.requirePeriod(id);
      return await membershipRepository.activatePeriod(id);
   }

   async setRegistrationOpen(id: string, open: boolean) {
      const period = await this.requirePeriod(id);
      if (open && !period.isActive) {
         throw new AppError(
            'Only the active period can open re-registration',
            409,
         );
      }
      return await membershipRepository.setRegistrationOpen(id, open);
   }

   async listResources(periodId: string) {
      await this.requirePeriod(periodId);
      return await membershipRepository.findResources(periodId);
   }

   async createResource(periodId: string, data: CreateResourceRequest) {
      await this.requirePeriod(periodId);
      await this.requireRegion(data.regionId);

      const resourceData: Prisma.MembershipResourceCreateInput = {
         title: data.title,
         description: data.description,
         url: data.url,
         period: { connect: { id: periodId } },
         ...(data.regionId && {
            region: { connect: { id: data.regionId } },
         }),
      };
      return await membershipRepository.createResource(periodId, resourceData);
   }

   async updateResource(id: string, data: UpdateResourceRequest) {
      if (!(await membershipRepository.findResource(id))) {
         throw new AppError('Membership resource not found', 404);
      }
      await this.requireRegion(data.regionId);

      const resourceData: Prisma.MembershipResourceUpdateInput = {
         title: data.title,
         description: data.description,
         url: data.url,
         ...(data.regionId !== undefined && {
            region: data.regionId
               ? { connect: { id: data.regionId } }
               : { disconnect: true },
         }),
      };
      return await membershipRepository.updateResource(id, resourceData);
   }

   async deleteResource(id: string) {
      if (!(await membershipRepository.findResource(id))) {
         throw new AppError('Membership resource not found', 404);
      }
      return await membershipRepository.deleteResource(id);
   }

   async reorderResources(periodId: string, resourceIds: string[]) {
      const current = await this.listResources(periodId);
      if (
         current.length !== resourceIds.length ||
         new Set(resourceIds).size !== resourceIds.length ||
         current.some((resource) => !resourceIds.includes(resource.id))
      ) {
         throw new AppError(
            'Resource order must include every period resource once',
            400,
         );
      }
      await membershipRepository.reorderResources(periodId, resourceIds);
      return await membershipRepository.findResources(periodId);
   }

   private async requirePeriod(id: string) {
      const period = await membershipRepository.findPeriod(id);
      if (!period) throw new AppError('Membership period not found', 404);
      return period;
   }

   private async requireRegion(regionId: string | null | undefined) {
      if (regionId && !(await membershipRepository.findRegion(regionId))) {
         throw new AppError('Active region not found', 400);
      }
   }
}

export const membershipService = new MembershipService();
