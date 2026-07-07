import { FormQuestion, Prisma } from '@prisma/client';
import { prisma } from '@/config/prisma.js';

class RegistrationFormRepository {
   async findFormById(id: string) {
      return await prisma.registrationForm.findUnique({
         where: { id },
         include: {
            subEvent: {
               select: {
                  eventId: true,
               },
            },
         },
      });
   }

   async findQuestionsByFormId(registrationFormId: string) {
      return await prisma.formQuestion.findMany({
         where: {
            registrationFormId,
         },
         select: {
            fieldKey: true,
            orderIndex: true,
         },
      });
   }

   async findQuestionById(id: string) {
      return await prisma.formQuestion.findUnique({
         where: { id },
         include: {
            form: {
               select: {
                  id: true,
                  status: true,
                  subEvent: {
                     select: {
                        eventId: true,
                     },
                  },
               },
            },
            options: true,
         },
      });
   }

   async createQuestion(data: Prisma.FormQuestionCreateInput) {
      return await prisma.formQuestion.create({
         data,
         include: {
            options: true,
         },
      });
   }

   async countResponsesForForm(formId: string): Promise<number> {
      return await prisma.registrationResponse.count({
         where: {
            registrationFormId: formId,
         },
      });
   }

   async updateQuestion(
      id: string,
      data: Prisma.FormQuestionUpdateInput,
   ): Promise<FormQuestion> {
      return await prisma.formQuestion.update({
         where: { id },
         data,
         include: {
            options: true,
         },
      });
   }

   async deleteQuestion(id: string, userId: string): Promise<FormQuestion> {
      return await prisma.$transaction(async (tx) => {
         await tx.formQuestionOption.updateMany({
            where: {
               formQuestionId: id,
            },
            data: {
               isActive: false,
               updatedBy: userId,
            },
         });

         return await tx.formQuestion.update({
            where: { id },
            data: {
               status: 'INACTIVE',
               updater: {
                  connect: {
                     id: userId,
                  },
               },
            },
            include: {
               options: true,
            },
         });
      });
   }
}

export const registrationFormRepository = new RegistrationFormRepository();
