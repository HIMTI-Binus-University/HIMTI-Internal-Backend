import { PrismaClient, Prisma, Subevent } from '@prisma/client';

const prisma = new PrismaClient();

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
