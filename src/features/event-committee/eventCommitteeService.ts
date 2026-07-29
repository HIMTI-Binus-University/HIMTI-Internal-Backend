import type { CommitteeRole } from '@prisma/client';
import { AppError } from '@/utils/appError.js';
import { isAdminUser } from '@/utils/statusAccess.js';
import { eventCommitteeRepository } from './eventCommitteeRepository.js';
import type {
   AssignEventCommitteeRequest,
   RemoveEventCommitteeRequest,
   UpdateEventCommitteeRequest,
} from './eventCommitteeTypes.js';

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

   private async assertEventExists(eventId: string) {
      const event = await eventCommitteeRepository.findEventById(eventId);

      if (!event) {
         throw new AppError('Event not found', 404);
      }

      return event;
   }

   private async assertTargetUserIsActive(userId: string) {
      const user = await eventCommitteeRepository.findUserById(userId);

      if (!user) {
         throw new AppError('User not found', 404);
      }

      if (user.status !== 'ACTIVE') {
         throw new AppError(
            'Only active users can join an event committee',
            400,
         );
      }

      return user;
   }

   private async assertCanViewCommittee(
      eventId: string,
      user: SessionUserWithRoles,
   ) {
      if (isAdminUser(user)) return;

      await this.assertEventCommitteeMember(eventId, user.id);
   }

   private async assertCanManageCommittee(
      eventId: string,
      user: SessionUserWithRoles,
   ) {
      await this.assertEventSteeringCommitteeMemberOrAdmin(eventId, user);
   }

   private async assertMembershipExists(eventId: string, userId: string) {
      const membership = await this.getMembership(eventId, userId);

      if (!membership) {
         throw new AppError('Event committee membership not found', 404);
      }

      return membership;
   }

   private async assertNotLastSteeringMember(
      eventId: string,
      role: CommitteeRole,
   ) {
      if (!this.isSteeringCommitteeRole(role)) return;

      const steeringMemberCount =
         await eventCommitteeRepository.countSteeringMembers(
            eventId,
            steeringCommitteeRoles,
         );

      if (steeringMemberCount <= 1) {
         throw new AppError(
            'An event must have at least one steering committee member',
            400,
         );
      }
   }

   async getCommitteeByEvent(eventId: string, user: SessionUserWithRoles) {
      await this.assertEventExists(eventId);
      await this.assertCanViewCommittee(eventId, user);

      return await eventCommitteeRepository.findManyByEventId(eventId);
   }

   async assignCommitteeMember(
      payload: AssignEventCommitteeRequest,
      user: SessionUserWithRoles,
   ) {
      await this.assertEventExists(payload.eventId);
      await this.assertCanManageCommittee(payload.eventId, user);
      await this.assertTargetUserIsActive(payload.userId);

      const membership = await this.getMembership(
         payload.eventId,
         payload.userId,
      );

      if (membership) {
         throw new AppError('User is already assigned to this event', 409);
      }

      return await eventCommitteeRepository.create(
         payload.eventId,
         payload.userId,
         payload.role,
      );
   }

   async updateCommitteeMember(
      payload: UpdateEventCommitteeRequest,
      user: SessionUserWithRoles,
   ) {
      await this.assertEventExists(payload.eventId);
      await this.assertCanManageCommittee(payload.eventId, user);

      const membership = await this.assertMembershipExists(
         payload.eventId,
         payload.userId,
      );

      if (
         this.isSteeringCommitteeRole(membership.role) &&
         !this.isSteeringCommitteeRole(payload.role)
      ) {
         await this.assertNotLastSteeringMember(
            payload.eventId,
            membership.role,
         );
      }

      return await eventCommitteeRepository.updateRole(
         payload.eventId,
         payload.userId,
         payload.role,
      );
   }

   async removeCommitteeMember(
      payload: RemoveEventCommitteeRequest,
      user: SessionUserWithRoles,
   ) {
      await this.assertEventExists(payload.eventId);
      await this.assertCanManageCommittee(payload.eventId, user);

      const membership = await this.assertMembershipExists(
         payload.eventId,
         payload.userId,
      );

      await this.assertNotLastSteeringMember(payload.eventId, membership.role);

      return await eventCommitteeRepository.remove(
         payload.eventId,
         payload.userId,
      );
   }
}

export const eventCommitteeService = new EventCommitteeService();
