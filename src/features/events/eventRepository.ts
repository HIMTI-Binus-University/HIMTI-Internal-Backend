import { PrismaClient, Prisma, Event } from '@prisma/client';

const prisma = new PrismaClient();

class EventRepository {
   async create(data: Prisma.EventCreateInput): Promise<Event> {
      return await prisma.event.create({ data });
   }
}

export const eventRepository = new EventRepository();
