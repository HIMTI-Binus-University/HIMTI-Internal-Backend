import { AppError } from '@/utils/appError.js';
import { membershipRepository } from './membershipRepository.js';
import type { MembershipResources } from './membershipTypes.js';

class MembershipService {
   async getMembershipResources(userId: string): Promise<MembershipResources> {
      const user = await membershipRepository.findUserProfile(userId);

      if (!user?.registrationCompletedAt) {
         throw new AppError('registration_required', 403);
      }

      const period = await membershipRepository.findActivePeriod();

      if (!period) {
         throw new AppError('active_membership_period_not_found', 404);
      }

      const { groups, contacts } = await membershipRepository.findResources(
         period.id,
         user,
      );

      return { period, groups, contacts };
   }
}

export const membershipService = new MembershipService();
