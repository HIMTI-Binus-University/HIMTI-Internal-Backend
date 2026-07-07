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
] as const;

class SubEventRepository {
   async findById(id: string): Promise<Subevent | null> {
      return await prisma.subevent.findUnique({
         where: { id },
      });
   }

   async findAll(params: GetSubEventQuery, userId: string, isAdmin: boolean) {
      const { page, limit, search, sort, status, visibility, eventId } = params;

      const where: Prisma.SubeventWhereInput = {
         ...(eventId && { eventId }),
         ...(status && { status }),
         ...(visibility && { visibility }),
         ...(!isAdmin && {
            event: {
               eventComittees: {
                  some: {
                     userId,
                  },
               },
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
            participants: {
               include: {
                  user: {
                     select: {
                        id: true,
                        name: true,
                        email: true,
                        image: true,
                     },
                  },
                  registrationResponses: {
                     include: {
                        answers: true,
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
      return await prisma.subevent.update({
         where: { id },
         data,
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

   async create(data: Prisma.SubeventCreateInput): Promise<Subevent> {
      return await prisma.subevent.create({
         data,
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
      return await prisma.$transaction(async (tx) => {
         await tx.registrationForm.updateMany({
            where: {
               subEventId: id,
            },
            data: {
               status: 'CLOSED',
               updatedBy: userId,
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
      });
   }
}

export const subEventRepository = new SubEventRepository();
