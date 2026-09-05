import { Prisma } from '@prisma/client';
import { prisma } from '@/config/prisma.js';
import type { EventGroupList } from './eventGroupTypes.js';
const whereFor = (q: EventGroupList): Prisma.EventGroupWhereInput =>
   q.search ? { name: { contains: q.search, mode: 'insensitive' } } : {};
class EventGroupRepository {
   listPublic(q: EventGroupList) {
      return prisma.eventGroup.findMany({
         where: { ...whereFor(q), status: 'PUBLISHED' },
         include: { events: { where: { status: 'PUBLISHED' } } },
         skip: (q.page - 1) * q.limit,
         take: q.limit,
      });
   }
   getPublic(id: string) {
      return prisma.eventGroup.findFirst({
         where: { id, status: 'PUBLISHED' },
         include: { events: { where: { status: 'PUBLISHED' } } },
      });
   }
   listInternal(q: EventGroupList, userId: string, admin: boolean) {
      return prisma.eventGroup.findMany({
         where: {
            ...whereFor(q),
            ...(!admin && { organizers: { some: { userId } } }),
         },
         include: { organizers: true },
         skip: (q.page - 1) * q.limit,
         take: q.limit,
      });
   }
   find(id: string) {
      return prisma.eventGroup.findUnique({ where: { id } });
   }
   hasScope(id: string, userId: string) {
      return prisma.eventGroup.findFirst({
         where: { id, organizers: { some: { userId } } },
         select: { id: true },
      });
   }
   hasManagerScope(id: string, userId: string) {
      return prisma.eventGroup.findFirst({
         where: { id, organizers: { some: { userId, role: 'MANAGER' } } },
         select: { id: true },
      });
   }
   create(data: Prisma.EventGroupCreateInput) {
      return prisma.eventGroup.create({ data });
   }
   update(id: string, data: Prisma.EventGroupUpdateInput) {
      return prisma.eventGroup.update({ where: { id }, data });
   }
   organizers(id: string) {
      return prisma.eventGroupOrganizer.findMany({
         where: { eventGroupId: id },
         include: { user: { select: { id: true, name: true, email: true } } },
      });
   }
   addOrganizer(
      eventGroupId: string,
      userId: string,
      role: 'MANAGER' | 'ORGANIZER',
      assignedBy: string,
   ) {
      return prisma.eventGroupOrganizer.create({
         data: { eventGroupId, userId, role, assignedBy },
      });
   }
   updateOrganizer(
      eventGroupId: string,
      userId: string,
      role: 'MANAGER' | 'ORGANIZER',
   ) {
      return prisma.eventGroupOrganizer.update({
         where: { eventGroupId_userId: { eventGroupId, userId } },
         data: { role },
      });
   }
   removeOrganizer(eventGroupId: string, userId: string) {
      return prisma.eventGroupOrganizer.delete({
         where: { eventGroupId_userId: { eventGroupId, userId } },
      });
   }
   changeOrganizer(
      eventGroupId: string,
      userId: string,
      role: 'MANAGER' | 'ORGANIZER' | null,
   ) {
      return prisma.$transaction(async (tx) => {
         await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`event-group:${eventGroupId}`}))`;
         const organizer = await tx.eventGroupOrganizer.findUnique({
            where: { eventGroupId_userId: { eventGroupId, userId } },
         });
         if (!organizer) return { result: 'NOT_FOUND' as const };
         if (
            organizer.role === 'MANAGER' &&
            role !== 'MANAGER' &&
            (await tx.eventGroupOrganizer.count({
               where: { eventGroupId, role: 'MANAGER' },
            })) === 1
         )
            return { result: 'LAST_MANAGER' as const };
         const data = role
            ? await tx.eventGroupOrganizer.update({
                 where: { eventGroupId_userId: { eventGroupId, userId } },
                 data: { role },
              })
            : await tx.eventGroupOrganizer.delete({
                 where: { eventGroupId_userId: { eventGroupId, userId } },
              });
         return { result: 'UPDATED' as const, data };
      });
   }
   organizer(eventGroupId: string, userId: string) {
      return prisma.eventGroupOrganizer.findUnique({
         where: { eventGroupId_userId: { eventGroupId, userId } },
      });
   }
   managerCount(eventGroupId: string) {
      return prisma.eventGroupOrganizer.count({
         where: { eventGroupId, role: 'MANAGER' },
      });
   }
}
export const eventGroupRepository = new EventGroupRepository();
