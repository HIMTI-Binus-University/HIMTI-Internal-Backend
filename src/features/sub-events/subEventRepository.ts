import { Prisma, Subevent } from '@prisma/client';
import { prisma } from '@/config/prisma.js';
import { parseSort } from '@/utils/sort.js';
import type { GetSubEventQuery } from './subEventTypes.js';

const allowedSubEventSortFields = [
   'date',
   'createdAt',
   'updatedAt',
   'name',
   'status',
   'visibility',
   'price',
   'position',
] as const;

export const buildSubEventCommitteeWhere = (
   params: GetSubEventQuery,
   userId: string,
   isAdmin: boolean,
): Prisma.SubeventWhereInput => {
   const { search, status, visibility, eventId } = params;
   const where: Prisma.SubeventWhereInput = {
      ...(eventId && { eventId }),
      ...(status && { status }),
      ...(visibility && { visibility }),
      ...(!isAdmin && {
         event: {
            OR: [
               { createdBy: userId },
               { eventComittees: { some: { userId } } },
            ],
         },
      }),
   };

   if (search) {
      where.OR = [
         { name: { contains: search, mode: 'insensitive' } },
         { publicDescription: { contains: search, mode: 'insensitive' } },
         { privateDescription: { contains: search, mode: 'insensitive' } },
      ];
   }

   return where;
};

class SubEventRepository {
   async findById(id: string): Promise<Subevent | null> {
      return await prisma.subevent.findUnique({
         where: { id },
      });
   }

   async findAll(params: GetSubEventQuery, userId: string, isAdmin: boolean) {
      const { page, limit, sort } = params;
      const where = buildSubEventCommitteeWhere(params, userId, isAdmin);

      const sortOption = parseSort(sort, allowedSubEventSortFields, {
         field: 'date',
         direction: 'asc',
      });
      const orderBy: Prisma.SubeventOrderByWithRelationInput = {
         [sortOption.field]: sortOption.direction,
      };

      const skip = (page - 1) * limit;

      const [data, total] = await prisma.$transaction([
         prisma.subevent.findMany({
            where,
            orderBy,
            skip,
            take: limit,
            select: {
               id: true,
               eventId: true,
               name: true,
               publicDescription: true,
               privateDescription: true,
               date: true,
               type: true,
               locationName: true,
               locationUrl: true,
               posterUrl: true,
               destinationUrl: true,
               position: true,
               price: true,
               paid: true,
               visibility: true,
               status: true,
               isRegistrationOpen: true,
               autoAcceptRegistration: true,
               maxParticipants: true,
               maxTicketsPerUser: true,
               registrationForms: {
                  select: {
                     id: true,
                     status: true,
                     _count: {
                        select: {
                           questions: true,
                        },
                     },
                  },
               },
               participants: {
                  select: {
                     id: true,
                     registrationResponses: {
                        select: {
                           id: true,
                           status: true,
                        },
                     },
                  },
               },
            },
         }),
         prisma.subevent.count({ where }),
      ]);

      return { data, total };
   }

   async findDetailById(id: string) {
      return await prisma.subevent.findUnique({
         where: { id },
         include: {
            registrationForms: {
               include: {
                  questions: {
                     orderBy: {
                        orderIndex: 'asc',
                     },
                     include: {
                        options: true,
                     },
                  },
               },
            },
         },
      });
   }

   async update(
      id: string,
      data: Prisma.SubeventUpdateInput,
   ): Promise<Subevent> {
      return await prisma.$transaction(async (tx) => {
         const updated = await tx.subevent.update({
            where: { id },
            data,
            include: {
               registrationForms: {
                  include: { questions: { include: { options: true } } },
               },
            },
         });
         return updated;
      });
   }

   async create(
      eventId: string,
      data: Prisma.SubeventCreateInput,
   ): Promise<Subevent> {
      const aggregate = await prisma.subevent.aggregate({
         where: { eventId },
         _max: { position: true },
      });
      return await prisma.subevent.create({
         data: {
            ...data,
            position: (aggregate._max.position ?? -1) + 1,
         },
         include: {
            registrationForms: {
               include: {
                  questions: {
                     include: { options: true },
                  },
               },
            },
         },
      });
   }

   async cancelSubEvent(id: string, userId: string): Promise<Subevent> {
      return await prisma.$transaction(
         async (tx) => {
            await tx.$queryRaw`SELECT "id" FROM "subevents" WHERE "id" = ${id} FOR UPDATE`;
            await tx.registrationForm.updateMany({
               where: {
                  subEventId: id,
               },
               data: {
                  status: 'CLOSED',
                  updatedBy: userId,
               },
            });

            const now = new Date();
            const activeOrders = await tx.registrationOrder.findMany({
               where: {
                  subEventId: id,
                  status: { notIn: ['REJECTED', 'EXPIRED', 'CANCELLED'] },
               },
               select: { id: true, status: true },
            });
            await tx.registrationCapacityHold.updateMany({
               where: {
                  subEventId: id,
                  status: { in: ['ACTIVE', 'CONSUMED'] },
               },
               data: { status: 'RELEASED', releasedAt: now },
            });
            await tx.registrationOrderMember.updateMany({
               where: { subEventId: id, status: { not: 'CANCELLED' } },
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
                  subEventId: id,
                  status: { in: ['PENDING', 'ACTIVE'] },
               },
               data: { status: 'REVOKED', revokedAt: now },
            });
            await tx.registrationPayment.updateMany({
               where: {
                  order: { subEventId: id },
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
                     reason: 'Sub-event cancelled',
                  },
               });
            }
            await tx.registrationOrder.updateMany({
               where: { id: { in: activeOrders.map((order) => order.id) } },
               data: {
                  status: 'CANCELLED',
                  revision: { increment: 1 },
                  cancelledAt: now,
                  cancellationReason: 'Sub-event cancelled',
               },
            });

            return await tx.subevent.update({
               where: { id },
               data: {
                  status: 'CANCELLED',
                  isRegistrationOpen: false,
                  updater: {
                     connect: {
                        id: userId,
                     },
                  },
               },
               include: {
                  registrationForms: {
                     include: {
                        questions: {
                           include: { options: true },
                        },
                     },
                  },
               },
            });
         },
         { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
   }
}

export const subEventRepository = new SubEventRepository();
