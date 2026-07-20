import {
   FormQuestion,
   FormQuestionOption,
   Prisma,
   RegistrationFormStatus,
} from '@prisma/client';
import { prisma } from '@/config/prisma.js';

const registrationFormDetailInclude = {
   subEvent: {
      select: {
         eventId: true,
      },
   },
   questions: {
      orderBy: {
         orderIndex: 'asc' as const,
      },
      include: {
         options: {
            orderBy: {
               createdAt: 'asc' as const,
            },
         },
      },
   },
   _count: {
      select: {
         registrationResponses: true,
      },
   },
} satisfies Prisma.RegistrationFormInclude;

class RegistrationFormRepository {
   async findSubEventById(id: string) {
      return await prisma.subevent.findUnique({
         where: { id },
         select: {
            id: true,
            eventId: true,
         },
      });
   }

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

   async findFormBySubEventId(subEventId: string) {
      return await prisma.registrationForm.findFirst({
         where: { subEventId },
         orderBy: { createdAt: 'asc' },
         include: registrationFormDetailInclude,
      });
   }

   async findFormDetailById(id: string) {
      return await prisma.registrationForm.findUnique({
         where: { id },
         include: registrationFormDetailInclude,
      });
   }

   async createForm(subEventId: string, userId: string) {
      return await prisma.registrationForm.create({
         data: {
            subEvent: {
               connect: {
                  id: subEventId,
               },
            },
            creator: {
               connect: {
                  id: userId,
               },
            },
         },
         include: registrationFormDetailInclude,
      });
   }

   async updateFormStatus(
      id: string,
      status: RegistrationFormStatus,
      userId: string,
   ) {
      return await prisma.registrationForm.update({
         where: { id },
         data: {
            status,
            updater: {
               connect: {
                  id: userId,
               },
            },
         },
         include: registrationFormDetailInclude,
      });
   }

   async updateFormStatusAndCloseRegistration(
      id: string,
      subEventId: string,
      status: RegistrationFormStatus,
      userId: string,
   ) {
      return await prisma.$transaction(async (tx) => {
         await tx.subevent.update({
            where: { id: subEventId },
            data: {
               isRegistrationOpen: false,
               updater: {
                  connect: {
                     id: userId,
                  },
               },
            },
         });

         return await tx.registrationForm.update({
            where: { id },
            data: {
               status,
               updater: {
                  connect: {
                     id: userId,
                  },
               },
            },
            include: registrationFormDetailInclude,
         });
      });
   }

   async findQuestionsByFormId(registrationFormId: string) {
      return await prisma.formQuestion.findMany({
         where: {
            registrationFormId,
         },
         select: {
            id: true,
            fieldKey: true,
            orderIndex: true,
            status: true,
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

   async reorderQuestions(
      formId: string,
      questionIds: string[],
      userId: string,
   ) {
      return await prisma.$transaction(async (tx) => {
         await Promise.all(
            questionIds.map((questionId, orderIndex) =>
               tx.formQuestion.update({
                  where: { id: questionId },
                  data: {
                     orderIndex,
                     updater: {
                        connect: {
                           id: userId,
                        },
                     },
                  },
               }),
            ),
         );

         return await tx.formQuestion.findMany({
            where: {
               registrationFormId: formId,
               status: 'ACTIVE',
            },
            orderBy: {
               orderIndex: 'asc',
            },
            include: {
               options: true,
            },
         });
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

   async findOptionById(id: string) {
      return await prisma.formQuestionOption.findUnique({
         where: { id },
         include: {
            question: {
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
               },
            },
         },
      });
   }

   async findActiveOptionByValue(
      formQuestionId: string,
      value: string,
      excludeId?: string,
   ) {
      return await prisma.formQuestionOption.findFirst({
         where: {
            formQuestionId,
            value,
            isActive: true,
            ...(excludeId && { id: { not: excludeId } }),
         },
      });
   }

   async countActiveOptionsForQuestion(
      formQuestionId: string,
   ): Promise<number> {
      return await prisma.formQuestionOption.count({
         where: {
            formQuestionId,
            isActive: true,
         },
      });
   }

   async createQuestionOption(
      data: Prisma.FormQuestionOptionCreateInput,
   ): Promise<FormQuestionOption> {
      return await prisma.formQuestionOption.create({ data });
   }

   async updateQuestionOption(
      id: string,
      data: Prisma.FormQuestionOptionUpdateInput,
   ): Promise<FormQuestionOption> {
      return await prisma.formQuestionOption.update({
         where: { id },
         data,
      });
   }

   async deleteQuestionOption(
      id: string,
      userId: string,
   ): Promise<FormQuestionOption> {
      return await prisma.formQuestionOption.update({
         where: { id },
         data: {
            isActive: false,
            updater: {
               connect: {
                  id: userId,
               },
            },
         },
      });
   }
}

export const registrationFormRepository = new RegistrationFormRepository();
