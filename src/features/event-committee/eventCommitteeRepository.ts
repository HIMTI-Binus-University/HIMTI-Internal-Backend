import type { CommitteeRole } from '@prisma/client';
import { prisma } from '@/config/prisma.js';

const committeeUserSelect = {
   id: true,
   name: true,
   email: true,
   image: true,
} as const;

class EventCommitteeRepository {
   async findEventById(eventId: string) {
      return await prisma.event.findUnique({
         where: { id: eventId },
         select: { id: true },
      });
   }

   async findUserById(userId: string) {
      return await prisma.user.findUnique({
         where: { id: userId },
         select: {
            id: true,
            status: true,
         },
      });
   }

   async findMembership(eventId: string, userId: string) {
      return await prisma.eventComittee.findUnique({
         where: {
            eventId_userId: {
               eventId,
               userId,
            },
         },
         include: {
            user: {
               select: committeeUserSelect,
            },
         },
      });
   }

   async findManyByEventId(eventId: string) {
      return await prisma.eventComittee.findMany({
         where: { eventId },
         orderBy: [{ role: 'asc' }, { assignedAt: 'asc' }],
         include: {
            user: {
               select: committeeUserSelect,
            },
         },
      });
   }

   async create(eventId: string, userId: string, role: CommitteeRole) {
      return await prisma.eventComittee.create({
         data: {
            eventId,
            userId,
            role,
         },
         include: {
            user: {
               select: committeeUserSelect,
            },
         },
      });
   }

   async updateRole(eventId: string, userId: string, role: CommitteeRole) {
      return await prisma.eventComittee.update({
         where: {
            eventId_userId: {
               eventId,
               userId,
            },
         },
         data: { role },
         include: {
            user: {
               select: committeeUserSelect,
            },
         },
      });
   }

   async remove(eventId: string, userId: string) {
      return await prisma.eventComittee.delete({
         where: {
            eventId_userId: {
               eventId,
               userId,
            },
         },
      });
   }

   async countSteeringMembers(
      eventId: string,
      roles: readonly CommitteeRole[],
   ): Promise<number> {
      return await prisma.eventComittee.count({
         where: {
            eventId,
            role: {
               in: [...roles],
            },
         },
      });
   }
}

export const eventCommitteeRepository = new EventCommitteeRepository();
