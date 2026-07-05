import { Prisma, Subevent } from '@prisma/client';
import { prisma } from '@/config/prisma.js';

class SubEventRepository {
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
}

export const subEventRepository = new SubEventRepository();
