import type { CommitteeRole } from '@prisma/client';
import { AppError } from '@/utils/appError.js';
import { eventCommitteeRepository } from './eventCommitteeRepository.js';

const steeringCommitteeRoles: readonly CommitteeRole[] = [
   'CHAIRPERSON',
   'VICE_CHAIRPERSON',
   'SECRETARY',
   'TREASURER',
];

class EventCommitteeService {
   isSteeringCommitteeRole(role: CommitteeRole): boolean {
      return steeringCommitteeRoles.includes(role);
   }

   async getMembership(eventId: string, userId: string) {
      return await eventCommitteeRepository.findMembership(eventId, userId);
   }

   async assertEventCommitteeMember(eventId: string, userId: string) {
      const membership = await this.getMembership(eventId, userId);

      if (!membership) {
         throw new AppError(
            'You are not assigned to this event committee',
            403,
         );
      }

      return membership;
   }

   async assertEventSteeringCommitteeMember(eventId: string, userId: string) {
      const membership = await this.assertEventCommitteeMember(eventId, userId);

      if (!this.isSteeringCommitteeRole(membership.role)) {
         throw new AppError(
            'You are not allowed to manage this event committee resource',
            403,
         );
      }

      return membership;
   }
}

export const eventCommitteeService = new EventCommitteeService();
