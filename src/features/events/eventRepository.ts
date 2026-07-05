import { Prisma, Event } from '@prisma/client';
import { prisma } from '@/config/prisma.js';

class EventRepository {
   async create(data: Prisma.EventCreateInput): Promise<Event> {
      return await prisma.event.create({ data });
   }
}

export const eventRepository = new EventRepository();
