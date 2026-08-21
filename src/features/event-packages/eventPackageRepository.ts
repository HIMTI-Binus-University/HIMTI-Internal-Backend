import { Prisma } from '@prisma/client';
import { prisma } from '@/config/prisma.js';

const packageInclude = {
   _count: { select: { orders: true } },
} satisfies Prisma.TicketPackageInclude;

class EventPackageRepository {
   findSubEvent(subEventId: string) {
      return prisma.subevent.findUnique({
         where: { id: subEventId },
         select: { id: true, eventId: true },
      });
   }

   list(subEventId: string) {
      return prisma.ticketPackage.findMany({
         where: { subEventId },
         orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
         include: packageInclude,
      });
   }

   find(packageId: string) {
      return prisma.ticketPackage.findUnique({
         where: { id: packageId },
         include: packageInclude,
      });
   }

   create(data: Prisma.TicketPackageUncheckedCreateInput) {
      return prisma.ticketPackage.create({ data, include: packageInclude });
   }

   async updateCas(
      packageId: string,
      revision: number,
      data: Prisma.TicketPackageUpdateManyMutationInput,
   ) {
      return prisma.$transaction(async (tx) => {
         const changed = await tx.ticketPackage.updateMany({
            where: { id: packageId, revision },
            data: { ...data, revision: { increment: 1 } },
         });
         if (changed.count !== 1) return null;
         return tx.ticketPackage.findUniqueOrThrow({
            where: { id: packageId },
            include: packageInclude,
         });
      });
   }
}

export const eventPackageRepository = new EventPackageRepository();
