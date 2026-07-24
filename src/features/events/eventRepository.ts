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
      return await prisma.$transaction(async (tx) => {
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
      });
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
