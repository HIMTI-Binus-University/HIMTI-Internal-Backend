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

class EventRepository {
   async create(data: Prisma.EventCreateInput): Promise<Event> {
      return await prisma.event.create({ data });
   }

   async findAllForCommitteeUser(params: GetEventQuery, userId: string) {
      const { page, limit, search, sort, status, visibility } = params;

      const where: Prisma.EventWhereInput = {
         eventComittees: {
            some: {
               userId,
            },
         },
         ...(status && { status }),
      };

      if (visibility) {
         where.subevents = {
            some: {
               visibility,
            },
         };
      }

      if (search) {
         where.OR = [
            { name: { contains: search, mode: 'insensitive' } },
            {
               subevents: {
                  some: {
                     name: { contains: search, mode: 'insensitive' },
                  },
               },
            },
         ];
      }

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
                  orderBy: {
                     date: 'asc',
                  },
                  select: {
                     id: true,
                     eventId: true,
                     name: true,
                     date: true,
                     type: true,
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
