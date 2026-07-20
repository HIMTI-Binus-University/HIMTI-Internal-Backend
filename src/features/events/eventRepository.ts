import { PrismaClient, Prisma, Event } from '@prisma/client';

const prisma = new PrismaClient();

export const eventSubEventSelect = {
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
   paymentAccountBank: true,
   paymentAccountNumber: true,
   paymentAccountName: true,
   priceModifier: true,
   paymentDesc: true,
   maxParticipants: true,
   maxTicketsPerUser: true,
   isRegistrationOpen: true,
   autoAcceptRegistration: true,
   visibility: true,
   status: true,
   createdAt: true,
   createdBy: true,
   updatedAt: true,
   updatedBy: true,
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
         _count: {
            select: {
               registrationResponses: {
                  where: {
                     status: 'SUBMITTED',
                  },
               },
            },
         },
      },
   },
   _count: {
      select: {
         participants: true,
      },
   },
} satisfies Prisma.SubeventSelect;

export type EventSubEventQueryResult = Prisma.SubeventGetPayload<{
   select: typeof eventSubEventSelect;
}>;

class EventRepository {
   async create(data: Prisma.EventCreateInput): Promise<Event> {
      return await prisma.event.create({ data });
   }
<<<<<<< Updated upstream
=======

   async update(id: string, data: Prisma.EventUpdateInput): Promise<Event> {
      return await prisma.event.update({ where: { id }, data });
   }

   async findById(id: string): Promise<Event | null> {
      return await prisma.event.findUnique({ where: { id } });
   }

   async findDetailById(id: string) {
      return await prisma.event.findUnique({
         where: { id },
         select: {
            id: true,
            name: true,
            publicDescription: true,
            coverImageUrl: true,
            status: true,
            createdAt: true,
            createdBy: true,
            updatedAt: true,
            updatedBy: true,
            subevents: {
               orderBy: {
                  date: 'asc',
               },
               select: eventSubEventSelect,
            },
         },
      });
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
                  select: eventSubEventSelect,
               },
            },
         }),
         prisma.event.count({ where }),
      ]);

      return { data, total };
   }
>>>>>>> Stashed changes
}

export const eventRepository = new EventRepository();
