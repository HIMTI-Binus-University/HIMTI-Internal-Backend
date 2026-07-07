import type { CommitteeRole } from '@prisma/client';
import { AppError } from '@/utils/appError.js';
import { isAdminUser } from '@/utils/statusAccess.js';
import { eventCommitteeRepository } from './eventCommitteeRepository.js';

type SessionUserWithRoles = {
   id: string;
   roles?: unknown;
};

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

   async assertEventSteeringCommitteeMemberOrAdmin(
      eventId: string,
      user: SessionUserWithRoles,
   ) {
      if (isAdminUser(user)) return null;

      return await this.assertEventSteeringCommitteeMember(eventId, user.id);
   }
}

export const eventCommitteeService = new EventCommitteeService();
