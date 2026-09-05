import { Prisma } from '@prisma/client';
import { prisma } from '@/config/prisma.js';
import type { RegistrationFormBody } from './registrationFormTypes.js';

const include = {
   sections: {
      orderBy: { orderIndex: 'asc' as const },
      include: {
         questions: {
            orderBy: { orderIndex: 'asc' as const },
            include: { options: { orderBy: { orderIndex: 'asc' as const } } },
         },
      },
   },
};
const nested = (body: RegistrationFormBody) => ({
   name: body.name,
   description: body.description,
   sections: {
      create: body.sections.map((section, orderIndex) => ({
         title: section.title,
         description: section.description,
         orderIndex,
         questions: {
            create: section.questions.map((question, questionIndex) => ({
               fieldKey: question.fieldKey,
               label: question.label,
               type: question.type,
               isRequired: question.isRequired,
               orderIndex: questionIndex,
               validation: question.validation as Prisma.InputJsonValue,
               options: {
                  create: question.options.map((value, optionIndex) => ({
                     ...value,
                     orderIndex: optionIndex,
                  })),
               },
            })),
         },
      })),
   },
});

class RegistrationFormRepository {
   latest(eventId: string) {
      return prisma.registrationForm.findFirst({
         where: { eventId },
         orderBy: { version: 'desc' },
         include,
      });
   }
   create(eventId: string, version: number, body: RegistrationFormBody) {
      return prisma.registrationForm.create({
         data: { eventId, version, status: 'DRAFT', ...nested(body) },
         include,
      });
   }
   replaceDraft(id: string, body: RegistrationFormBody) {
      return prisma.$transaction(async (tx) => {
         await tx.registrationFormSection.deleteMany({
            where: { registrationFormId: id },
         });
         return tx.registrationForm.update({
            where: { id },
            data: nested(body),
            include,
         });
      });
   }
   publish(eventId: string, id: string) {
      return prisma.$transaction(async (tx) => {
         await tx.registrationForm.updateMany({
            where: { eventId, status: 'PUBLISHED', id: { not: id } },
            data: { status: 'CLOSED' },
         });
         return tx.registrationForm.update({
            where: { id },
            data: { status: 'PUBLISHED', publishedAt: new Date() },
            include,
         });
      });
   }
   close(id: string) {
      return prisma.registrationForm.update({
         where: { id },
         data: { status: 'CLOSED' },
         include,
      });
   }
}
export const registrationFormRepository = new RegistrationFormRepository();
