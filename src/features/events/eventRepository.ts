import { Prisma } from '@prisma/client';
import { prisma } from '@/config/prisma.js';
import type { EventListQuery } from './eventTypes.js';

const publicSelect = {
   id: true,
   eventGroupId: true,
   name: true,
   publicDescription: true,
   startsAt: true,
   endsAt: true,
   locationName: true,
   locationAddress: true,
   locationUrl: true,
   coverImageUrl: true,
   primaryColor: true,
   secondaryColor: true,
   status: true,
   eventGroup: {
      select: {
         name: true,
         coverImageUrl: true,
         primaryColor: true,
         secondaryColor: true,
      },
   },
} satisfies Prisma.EventSelect;

const whereFor = (query: EventListQuery): Prisma.EventWhereInput => ({
   ...(query.status && { status: query.status }),
   ...(query.search && {
      name: { contains: query.search, mode: 'insensitive' },
   }),
});

class EventRepository {
   listPublic(query: EventListQuery) {
      return prisma.event.findMany({
         where: { ...whereFor(query), status: 'PUBLISHED' },
         select: publicSelect,
         orderBy: { startsAt: 'asc' },
         skip: (query.page - 1) * query.limit,
         take: query.limit,
      });
   }
   getPublic(id: string) {
      return prisma.event.findFirst({
         where: { id, status: 'PUBLISHED' },
         select: publicSelect,
      });
   }
   listInternal(query: EventListQuery, userId: string, admin: boolean) {
      const where = {
         ...whereFor(query),
         ...(!admin && {
            OR: [
               { organizers: { some: { userId } } },
               { eventGroup: { organizers: { some: { userId } } } },
            ],
         }),
      };
      return prisma.event.findMany({
         where,
         include: { organizers: true },
         orderBy: { createdAt: 'desc' },
         skip: (query.page - 1) * query.limit,
         take: query.limit,
      });
   }
   find(id: string) {
      return prisma.event.findUnique({
         where: { id },
         include: {
            organizers: true,
            eventGroup: { include: { organizers: true } },
         },
      });
   }
   findWithGroup(id: string) {
      return prisma.event.findUnique({
         where: { id },
         include: { eventGroup: { include: { organizers: true } } },
      });
   }
   create(data: Prisma.EventCreateInput) {
      return prisma.event.create({ data });
   }
   update(id: string, data: Prisma.EventUpdateInput) {
      return prisma.event.update({ where: { id }, data });
   }
   hasScope(id: string, userId: string) {
      return prisma.event.findFirst({
         where: {
            id,
            OR: [
               { organizers: { some: { userId } } },
               { eventGroup: { organizers: { some: { userId } } } },
            ],
         },
         select: { id: true },
      });
   }
   hasManagerScope(id: string, userId: string) {
      return prisma.event.findFirst({
         where: {
            id,
            OR: [
               { organizers: { some: { userId, role: 'MANAGER' } } },
               {
                  eventGroup: {
                     organizers: { some: { userId, role: 'MANAGER' } },
                  },
               },
            ],
         },
         select: { id: true },
      });
   }
   hasEventGroupScope(id: string, userId: string) {
      return prisma.eventGroup.findFirst({
         where: { id, organizers: { some: { userId } } },
         select: { id: true },
      });
   }
   findEventGroup(id: string) {
      return prisma.eventGroup.findUnique({
         where: { id },
         select: { id: true },
      });
   }
   hasEventGroupManagerScope(id: string, userId: string) {
      return prisma.eventGroup.findFirst({
         where: { id, organizers: { some: { userId, role: 'MANAGER' } } },
         select: { id: true },
      });
   }
   organizers(id: string) {
      return prisma.eventOrganizer.findMany({
         where: { eventId: id },
         include: { user: { select: { id: true, name: true, email: true } } },
      });
   }
   addOrganizer(
      eventId: string,
      userId: string,
      role: 'MANAGER' | 'ORGANIZER',
      assignedBy: string,
   ) {
      return prisma.eventOrganizer.create({
         data: { eventId, userId, role, assignedBy },
      });
   }
   updateOrganizer(
      eventId: string,
      userId: string,
      role: 'MANAGER' | 'ORGANIZER',
   ) {
      return prisma.eventOrganizer.update({
         where: { eventId_userId: { eventId, userId } },
         data: { role },
      });
   }
   removeOrganizer(eventId: string, userId: string) {
      return prisma.eventOrganizer.delete({
         where: { eventId_userId: { eventId, userId } },
      });
   }
   changeOrganizer(
      eventId: string,
      userId: string,
      role: 'MANAGER' | 'ORGANIZER' | null,
   ) {
      return prisma.$transaction(async (tx) => {
         await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`event:${eventId}`}))`;
         const organizer = await tx.eventOrganizer.findUnique({
            where: { eventId_userId: { eventId, userId } },
         });
         if (!organizer) return { result: 'NOT_FOUND' as const };
         if (
            organizer.role === 'MANAGER' &&
            role !== 'MANAGER' &&
            (await tx.eventOrganizer.count({
               where: { eventId, role: 'MANAGER' },
            })) === 1
         )
            return { result: 'LAST_MANAGER' as const };
         const data = role
            ? await tx.eventOrganizer.update({
                 where: { eventId_userId: { eventId, userId } },
                 data: { role },
              })
            : await tx.eventOrganizer.delete({
                 where: { eventId_userId: { eventId, userId } },
              });
         return { result: 'UPDATED' as const, data };
      });
   }
   organizer(eventId: string, userId: string) {
      return prisma.eventOrganizer.findUnique({
         where: { eventId_userId: { eventId, userId } },
      });
   }
   managerCount(eventId: string) {
      return prisma.eventOrganizer.count({
         where: { eventId, role: 'MANAGER' },
      });
   }
   registrationSettings(id: string) {
      return prisma.event.findUnique({
         where: { id },
         select: {
            id: true,
            isRegistrationOpen: true,
            registrationOpensAt: true,
            registrationClosesAt: true,
            cancellationClosesAt: true,
            capacity: true,
            paymentCurrency: true,
            paymentBankName: true,
            paymentAccountNumber: true,
            paymentAccountHolder: true,
            paymentInstructions: true,
            paymentProofTypes: true,
            paymentProofMaxBytes: true,
            attendanceEnabled: true,
            attendanceCheckoutEnabled: true,
         },
      });
   }
}
export const eventRepository = new EventRepository();
