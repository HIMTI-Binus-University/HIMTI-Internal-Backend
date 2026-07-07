import { prisma } from '@/config/prisma.js';

class EventCommitteeRepository {
   async findMembership(eventId: string, userId: string) {
      return await prisma.eventComittee.findUnique({
         where: {
            eventId_userId: {
               eventId,
               userId,
            },
         },
      });
   }
}

export const eventCommitteeRepository = new EventCommitteeRepository();
