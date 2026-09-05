import { Prisma } from '@prisma/client';
import { prisma } from '@/config/prisma.js';

class EventPackageRepository {
   list(eventId: string) {
      return prisma.ticketPackage.findMany({
         where: { eventId },
         orderBy: { createdAt: 'asc' },
      });
   }
   find(eventId: string, id: string) {
      return prisma.ticketPackage.findFirst({ where: { id, eventId } });
   }
   codes(eventId: string, prefix: string) {
      return prisma.ticketPackage.findMany({
         where: { eventId, code: { startsWith: prefix } },
         select: { code: true },
      });
   }
   create(data: Prisma.TicketPackageUncheckedCreateInput) {
      return prisma.ticketPackage.create({ data });
   }
   update(id: string, data: Prisma.TicketPackageUpdateInput) {
      return prisma.ticketPackage.update({ where: { id }, data });
   }
   orderCount(id: string) {
      return prisma.registrationOrder.count({ where: { ticketPackageId: id } });
   }
}
export const eventPackageRepository = new EventPackageRepository();
