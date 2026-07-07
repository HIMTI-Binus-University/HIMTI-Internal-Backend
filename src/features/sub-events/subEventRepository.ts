import { Prisma, Subevent } from '@prisma/client';
import { prisma } from '@/config/prisma.js';

class SubEventRepository {
   async findById(id: string): Promise<Subevent | null> {
      return await prisma.subevent.findUnique({
         where: { id },
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
