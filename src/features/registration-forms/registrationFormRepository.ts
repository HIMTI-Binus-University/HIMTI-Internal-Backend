import { Prisma } from '@prisma/client';
import { prisma } from '@/config/prisma.js';
import { AppError } from '@/utils/appError.js';
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
               logicalId: question.logicalId,
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
   save(eventId: string, body: RegistrationFormBody) {
      return prisma.$transaction(async (tx) => {
         await tx.$queryRaw`SELECT id FROM events WHERE id = ${eventId} FOR UPDATE`;
         const latest = await tx.registrationForm.findFirst({
            where: { eventId },
            orderBy: { version: 'desc' },
            include,
         });
         const current =
            (await tx.registrationForm.findFirst({
               where: { eventId, status: 'PUBLISHED' },
               orderBy: { version: 'desc' },
               include,
            })) ?? latest;
         if ((current?.revision ?? 0) !== body.expectedRevision)
            throw new AppError(
               'Form changed. Reload before saving.',
               409,
               'REVISION_CONFLICT',
            );
         if (current?.status === 'CLOSED')
            throw new AppError('Closed forms cannot be edited', 409);
         if (current?.status === 'DRAFT' && current.version !== 1)
            throw new AppError(
               'This legacy replacement draft has no verified question lineage. It cannot be edited or published. Ask an administrator to review the retained forms; if a published form exists, reload and edit that form instead.',
               409,
               'LEGACY_FORM_LINEAGE_REQUIRED',
            );
         const previous = new Set(
            current?.sections.flatMap((s) =>
               s.questions.map((q) => q.logicalId),
            ) ?? [],
         );
         const identities = body.sections.flatMap((s) =>
            s.questions.flatMap((q) => (q.logicalId ? [q.logicalId] : [])),
         );
         if (
            new Set(identities).size !== identities.length ||
            identities.some((id) => !previous.has(id))
         )
            throw new AppError(
               'Question identity does not belong to the current form',
               400,
            );
         const published = current?.status === 'PUBLISHED';
         if (
            published &&
            body.sections.some((s) =>
               s.questions.some((q) => q.type === 'FILE'),
            )
         )
            throw new AppError(
               'FILE questions cannot be published until private answer uploads are supported',
               422,
               'UNSUPPORTED_FILE_QUESTION',
            );
         if (current?.status === 'DRAFT') {
            await tx.registrationFormSection.deleteMany({
               where: { registrationFormId: current.id },
            });
            return tx.registrationForm.update({
               where: { id: current.id },
               data: { ...nested(body), revision: { increment: 1 } },
               include,
            });
         }
         if (published)
            await tx.registrationForm.update({
               where: { id: current.id },
               data: { status: 'CLOSED' },
            });
         const form = await tx.registrationForm.create({
            data: {
               eventId,
               version: (latest?.version ?? 0) + 1,
               revision: (current?.revision ?? 0) + 1,
               status: published ? 'PUBLISHED' : 'DRAFT',
               publishedAt: published ? new Date() : null,
               ...nested(body),
            },
            include,
         });
         if (published) {
            const questions = form.sections.flatMap((s) => s.questions);
            const members = await tx.registrationOrderMember.findMany({
               where: {
                  eventId,
                  status: { in: ['ACTIVE', 'LOCKED'] },
                  order: {
                     status: {
                        in: [
                           'ASSEMBLING',
                           'PENDING_PAYMENT',
                           'PAYMENT_REVIEW',
                           'CONFIRMED',
                        ],
                     },
                  },
               },
               select: { id: true },
            });
            await tx.supplementalQuestionRequest.updateMany({
               where: {
                  member: { eventId },
                  answeredAt: null,
                  withdrawnAt: null,
                  logicalId: { notIn: questions.map((q) => q.logicalId) },
               },
               data: { withdrawnAt: new Date() },
            });
            await tx.supplementalQuestionRequest.createMany({
               data: members.flatMap((member) =>
                  questions
                     .filter((q) => !previous.has(q.logicalId))
                     .map((q) => ({
                        orderMemberId: member.id,
                        logicalId: q.logicalId,
                        questionId: q.id,
                     })),
               ),
            });
            await tx.registrationOrderMember.updateMany({
               where: { id: { in: members.map((m) => m.id) } },
               data: { supplementalRevision: { increment: 1 } },
            });
         }
         return form;
      });
   }
   async latest(eventId: string) {
      // Legacy duplicate drafts must not hide the form accepting registrations.
      return (
         (await prisma.registrationForm.findFirst({
            where: { eventId, status: 'PUBLISHED' },
            orderBy: { version: 'desc' },
            include,
         })) ??
         prisma.registrationForm.findFirst({
            where: { eventId },
            orderBy: { version: 'desc' },
            include,
         })
      );
   }
   publish(eventId: string, id: string, revision: number) {
      return prisma.$transaction(async (tx) => {
         await tx.$queryRaw`SELECT id FROM events WHERE id = ${eventId} FOR UPDATE`;
         const current = await tx.registrationForm.findFirst({
            where: { id, eventId, revision, status: 'DRAFT' },
         });
         if (!current)
            throw new AppError(
               'Form changed. Reload before publishing.',
               409,
               'REVISION_CONFLICT',
            );
         const other = await tx.registrationForm.findFirst({
            where: { eventId, id: { not: id } },
            select: { id: true },
         });
         if (current.version !== 1 || other)
            throw new AppError(
               'Legacy replacement drafts cannot be published because their question lineage is unknown. Reload and edit the current published Registration Form. If none is published, ask an administrator to review the retained forms.',
               409,
               'LEGACY_FORM_LINEAGE_REQUIRED',
            );
         return tx.registrationForm.update({
            where: { id },
            data: {
               status: 'PUBLISHED',
               publishedAt: new Date(),
               revision: { increment: 1 },
            },
            include,
         });
      });
   }
   close(eventId: string, id: string, revision: number) {
      return prisma.$transaction(async (tx) => {
         await tx.$queryRaw`SELECT id FROM events WHERE id = ${eventId} FOR UPDATE`;
         const current = await tx.registrationForm.findFirst({
            where: { id, eventId, revision, status: 'PUBLISHED' },
         });
         if (!current)
            throw new AppError(
               'Form changed. Reload before closing.',
               409,
               'REVISION_CONFLICT',
            );
         return tx.registrationForm.update({
            where: { id },
            data: { status: 'CLOSED', revision: { increment: 1 } },
            include,
         });
      });
   }
}
export const registrationFormRepository = new RegistrationFormRepository();
