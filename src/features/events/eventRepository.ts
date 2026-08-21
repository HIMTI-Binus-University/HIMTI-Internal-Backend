import { Prisma, Event } from '@prisma/client';
import { prisma } from '@/config/prisma.js';
import { parseSort } from '@/utils/sort.js';
import type { GetEventQuery } from './eventTypes.js';

const allowedEventSortFields = [
   'createdAt',
   'updatedAt',
   'name',
   'status',
] as const;

export const buildEventCommitteeWhere = (
   params: GetEventQuery,
   userId: string,
   isAdmin: boolean,
): Prisma.EventWhereInput => {
   const { search, status, visibility } = params;
   const where: Prisma.EventWhereInput = {
      ...(status && { status }),
      ...(!isAdmin && {
         OR: [{ createdBy: userId }, { eventComittees: { some: { userId } } }],
      }),
   };

   if (visibility) {
      where.subevents = { some: { visibility } };
   }

   if (search) {
      where.AND = [
         {
            OR: [
               { name: { contains: search, mode: 'insensitive' } },
               {
                  publicDescription: {
                     contains: search,
                     mode: 'insensitive',
                  },
               },
               {
                  subevents: {
                     some: {
                        name: { contains: search, mode: 'insensitive' },
                     },
                  },
               },
            ],
         },
      ];
   }

   return where;
};

class EventRepository {
   async findPublishedForMembers() {
      return await prisma.event.findMany({
         where: {
            status: 'PUBLISHED',
            subevents: {
               some: {
                  status: 'OPEN',
                  visibility: { in: ['PUBLIC', 'INTERNAL'] },
               },
            },
         },
         orderBy: { createdAt: 'desc' },
         select: {
            id: true,
            name: true,
            publicDescription: true,
            coverImageUrl: true,
            subevents: {
               where: {
                  status: 'OPEN',
                  visibility: { in: ['PUBLIC', 'INTERNAL'] },
               },
               orderBy: [{ position: 'asc' }, { date: 'asc' }, { id: 'asc' }],
               select: {
                  id: true,
                  name: true,
                  publicDescription: true,
                  date: true,
                  type: true,
                  locationName: true,
                  locationUrl: true,
                  posterUrl: true,
                  destinationUrl: true,
                  position: true,
                  price: true,
                  maxParticipants: true,
                  isRegistrationOpen: true,
               },
            },
         },
      });
   }

   async findPublishedByIdForMembers(id: string) {
      return await prisma.event.findFirst({
         where: {
            id,
            status: 'PUBLISHED',
            subevents: {
               some: {
                  status: 'OPEN',
                  visibility: { in: ['PUBLIC', 'INTERNAL'] },
               },
            },
         },
         select: {
            id: true,
            name: true,
            publicDescription: true,
            coverImageUrl: true,
            subevents: {
               where: {
                  status: 'OPEN',
                  visibility: { in: ['PUBLIC', 'INTERNAL'] },
               },
               orderBy: [{ position: 'asc' }, { date: 'asc' }, { id: 'asc' }],
               select: {
                  id: true,
                  name: true,
                  publicDescription: true,
                  date: true,
                  type: true,
                  locationName: true,
                  locationUrl: true,
                  posterUrl: true,
                  destinationUrl: true,
                  position: true,
                  price: true,
                  maxParticipants: true,
                  isRegistrationOpen: true,
               },
            },
         },
      });
   }

   async findSubEventsForOrder(eventId: string) {
      return await prisma.subevent.findMany({
         where: { eventId },
         orderBy: [{ position: 'asc' }, { date: 'asc' }, { id: 'asc' }],
         select: { id: true, position: true },
      });
   }

   async reorderSubEvents(eventId: string, subEventIds: string[]) {
      return await prisma.$transaction(
         subEventIds.map((id, position) =>
            prisma.subevent.update({
               where: { id, eventId },
               data: { position },
            }),
         ),
      );
   }
   async create(data: Prisma.EventCreateInput): Promise<Event> {
      return await prisma.event.create({ data });
   }

   async update(id: string, data: Prisma.EventUpdateInput): Promise<Event> {
      return await prisma.event.update({ where: { id }, data });
   }

   async findById(id: string): Promise<Event | null> {
      return await prisma.event.findUnique({ where: { id } });
   }

   async cancelEvent(id: string, userId: string): Promise<Event> {
      return await prisma.$transaction(
         async (tx) => {
            const subEvents = await tx.subevent.findMany({
               where: { eventId: id },
               orderBy: { id: 'asc' },
               select: { id: true },
            });
            const subEventIds = subEvents.map((subEvent) => subEvent.id);
            if (subEventIds.length > 0) {
               await tx.$queryRaw`SELECT "id" FROM "subevents" WHERE "id" IN (${Prisma.join(subEventIds)}) ORDER BY "id" FOR UPDATE`;
            }
            await tx.registrationForm.updateMany({
               where: {
                  subEvent: {
                     eventId: id,
                  },
               },
               data: {
                  status: 'CLOSED',
                  updatedBy: userId,
               },
            });

            await tx.subevent.updateMany({
               where: {
                  eventId: id,
               },
               data: {
                  status: 'CANCELLED',
                  isRegistrationOpen: false,
                  updatedBy: userId,
               },
            });

            const now = new Date();
            const activeOrders = await tx.registrationOrder.findMany({
               where: {
                  eventId: id,
                  status: { notIn: ['REJECTED', 'EXPIRED', 'CANCELLED'] },
               },
               select: { id: true, status: true },
            });
            await tx.registrationCapacityHold.updateMany({
               where: {
                  order: { eventId: id },
                  status: { in: ['ACTIVE', 'CONSUMED'] },
               },
               data: { status: 'RELEASED', releasedAt: now },
            });
            await tx.registrationOrderMember.updateMany({
               where: {
                  order: { eventId: id },
                  status: { not: 'CANCELLED' },
               },
               data: { status: 'CANCELLED' },
            });
            await tx.registrationInvitation.updateMany({
               where: {
                  registrationOrderId: {
                     in: activeOrders.map((order) => order.id),
                  },
                  status: 'PENDING',
               },
               data: { status: 'REVOKED' },
            });
            await tx.registrationTicket.updateMany({
               where: {
                  subEventId: { in: subEventIds },
                  status: { in: ['PENDING', 'ACTIVE'] },
               },
               data: { status: 'REVOKED', revokedAt: now },
            });
            await tx.registrationPayment.updateMany({
               where: {
                  order: { eventId: id },
                  status: { in: ['UNPAID', 'PROOF_SUBMITTED', 'REJECTED'] },
               },
               data: { status: 'CANCELLED', revision: { increment: 1 } },
            });
            for (const order of activeOrders) {
               await tx.registrationStatusHistory.create({
                  data: {
                     registrationOrderId: order.id,
                     entityType: 'ORDER',
                     entityId: order.id,
                     fromStatus: order.status,
                     toStatus: 'CANCELLED',
                     actorUserId: userId,
                     reason: 'Event cancelled',
                  },
               });
            }
            await tx.registrationOrder.updateMany({
               where: { id: { in: activeOrders.map((order) => order.id) } },
               data: {
                  status: 'CANCELLED',
                  revision: { increment: 1 },
                  cancelledAt: now,
                  cancellationReason: 'Event cancelled',
               },
            });

            return await tx.event.update({
               where: { id },
               data: {
                  status: 'CANCELLED',
                  updater: {
                     connect: {
                        id: userId,
                     },
                  },
               },
            });
         },
         { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
   }

   async findAllForCommitteeUser(
      params: GetEventQuery,
      userId: string,
      isAdmin: boolean,
   ) {
      const { page, limit, sort } = params;
      const where = buildEventCommitteeWhere(params, userId, isAdmin);

      const sortOption = parseSort(sort, allowedEventSortFields, {
         field: 'createdAt',
         direction: 'desc',
      });
      const orderBy: Prisma.EventOrderByWithRelationInput = {
         [sortOption.field]: sortOption.direction,
      };

      const skip = (page - 1) * limit;

      const [data, total] = await prisma.$transaction([
         prisma.event.findMany({
            where,
            orderBy,
            skip,
            take: limit,
            select: {
               id: true,
               name: true,
               publicDescription: true,
               coverImageUrl: true,
               status: true,
               createdAt: true,
               updatedAt: true,
               subevents: {
                  orderBy: [
                     { position: 'asc' },
                     { date: 'asc' },
                     { id: 'asc' },
                  ],
                  select: {
                     id: true,
                     eventId: true,
                     name: true,
                     date: true,
                     type: true,
                     locationUrl: true,
                     posterUrl: true,
                     destinationUrl: true,
                     position: true,
                     visibility: true,
                     status: true,
                  },
               },
            },
         }),
         prisma.event.count({ where }),
      ]);

      return { data, total };
   }
}

export const eventRepository = new EventRepository();
