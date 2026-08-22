import { createHash, randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '@/config/prisma.js';
import { validateFreshSubmission } from '@/features/event-registrations/eventRegistrationTypes.js';
import type {
   InternalPostRegistrationListQuery,
   SavePostRegistrationResponse,
} from './postRegistrationFormTypes.js';

export type RegistrationTransaction = Prisma.TransactionClient;

const assignmentInclude = {
   form: {
      include: {
         sections: {
            where: { status: 'ACTIVE' as const },
            orderBy: { orderIndex: 'asc' as const },
         },
         questions: {
            where: { status: 'ACTIVE' as const },
            orderBy: { orderIndex: 'asc' as const },
            include: {
               options: {
                  where: { isActive: true },
                  orderBy: { orderIndex: 'asc' as const },
               },
            },
         },
      },
   },
   response: {
      include: {
         answers: { include: { question: true, selectedOptions: true } },
      },
   },
   order: {
      select: {
         id: true,
         status: true,
         buyerUserId: true,
         subEventId: true,
         ticketPackageId: true,
      },
   },
   orderMember: { select: { id: true, userId: true, status: true } },
} satisfies Prisma.PostRegistrationFormAssignmentInclude;

export const assignPublishedPostRegistrationForms = async (
   tx: RegistrationTransaction,
   options: { orderIds?: string[]; subEventId?: string; formId?: string },
) => {
   const subEventIds = options.subEventId
      ? [options.subEventId]
      : options.orderIds
        ? (
             await tx.registrationOrder.findMany({
                where: { id: { in: options.orderIds } },
                select: { subEventId: true },
             })
          ).map((order) => order.subEventId)
        : [];
   for (const subEventId of [...new Set(subEventIds)].sort())
      await tx.$queryRaw`SELECT "id" FROM "subevents" WHERE "id" = ${subEventId} FOR UPDATE`;
   const orders = await tx.registrationOrder.findMany({
      where: {
         status: 'APPROVED',
         ...(options.orderIds && { id: { in: options.orderIds } }),
         ...(options.subEventId && { subEventId: options.subEventId }),
      },
      include: {
         members: {
            where: { status: { not: 'CANCELLED' } },
            select: { id: true },
         },
      },
   });
   let created = 0;
   for (const order of orders) {
      const forms = await tx.registrationForm.findMany({
         where: {
            ...(options.formId && { id: options.formId }),
            subEventId: order.subEventId,
            stage: 'POST_REGISTRATION',
            status: 'PUBLISHED',
            deletedAt: null,
            logicalKey: { not: null },
         },
         orderBy: [{ orderIndex: 'asc' }, { id: 'asc' }],
      });
      for (const form of forms) {
         const targets =
            form.audience === 'BUYER'
               ? [null]
               : order.members.map((member) => member.id);
         for (const memberId of targets) {
            const existing = await tx.postRegistrationFormAssignment.findFirst({
               where: {
                  registrationOrderId: order.id,
                  logicalFormKey: form.logicalKey!,
                  orderMemberId: memberId,
               },
            });
            if (existing) continue;
            const responseId = randomUUID();
            await tx.registrationFormSubmission.create({
               data: {
                  id: responseId,
                  registrationFormId: form.id,
                  registrationOrderId: order.id,
                  orderMemberId: memberId,
                  assignmentAudience: form.audience,
                  assignmentRequired: form.isRequired,
                  assignmentOrderIndex: form.orderIndex,
               },
            });
            await tx.postRegistrationFormAssignment.create({
               data: {
                  registrationOrderId: order.id,
                  registrationFormId: form.id,
                  logicalFormKey: form.logicalKey!,
                  orderMemberId: memberId,
                  audience: form.audience,
                  isRequired: form.isRequired,
                  blocksCheckIn: form.blocksCheckIn,
                  orderIndex: form.orderIndex,
                  opensAt: form.opensAt,
                  closesAt: form.closesAt,
                  responseId,
               },
            });
            created++;
         }
      }
   }
   return created;
};

const ownWhere = (
   registrationId: string,
   userId: string,
): Prisma.PostRegistrationFormAssignmentWhereInput => ({
   registrationOrderId: registrationId,
   OR: [
      { order: { buyerUserId: userId }, orderMemberId: null },
      { orderMember: { userId, status: { not: 'CANCELLED' } } },
   ],
});

class PostRegistrationFormRepository {
   listOwned(registrationId: string, userId: string) {
      return prisma.postRegistrationFormAssignment.findMany({
         where: ownWhere(registrationId, userId),
         orderBy: [{ orderIndex: 'asc' }, { assignedAt: 'asc' }],
         include: assignmentInclude,
      });
   }
   findOwned(registrationId: string, assignmentId: string, userId: string) {
      return prisma.postRegistrationFormAssignment.findFirst({
         where: { id: assignmentId, ...ownWhere(registrationId, userId) },
         include: assignmentInclude,
      });
   }
   async save(
      registrationId: string,
      assignmentId: string,
      userId: string,
      payload: SavePostRegistrationResponse,
   ) {
      return prisma.$transaction(async (tx) => {
         const assignment = await tx.postRegistrationFormAssignment.findFirst({
            where: { id: assignmentId, ...ownWhere(registrationId, userId) },
            include: assignmentInclude,
         });
         if (!assignment) return null;
         const response = assignment.response!;
         const fresh = payload.answers.map((answer) => ({
            formQuestionId: answer.questionId,
            textValue:
               answer.type === 'TEXT' || answer.type === 'TEXTAREA'
                  ? answer.value
                  : null,
            numberValue:
               answer.type === 'NUMBER'
                  ? new Prisma.Decimal(answer.value)
                  : null,
            dateValue:
               answer.type === 'DATE'
                  ? new Date(`${answer.value}T00:00:00.000Z`)
                  : null,
            selectedOptions:
               'optionIds' in answer
                  ? answer.optionIds.map((optionId) => ({ optionId }))
                  : 'optionId' in answer
                    ? [{ optionId: answer.optionId }]
                    : [],
         }));
         const questionTypes = new Map(
            assignment.form.questions.map((question) => [
               question.id,
               question.fieldType,
            ]),
         );
         const contractErrors = payload.answers.flatMap((answer) =>
            questionTypes.get(answer.questionId) !== answer.type
               ? [
                    {
                       questionId: answer.questionId,
                       code:
                          questionTypes.get(answer.questionId) === 'FILE'
                             ? 'UNSUPPORTED_FILE_QUESTION'
                             : 'ANSWER_TYPE_MISMATCH',
                       message:
                          'Answer does not match the assigned question type',
                    },
                 ]
               : [],
         );
         const errors = [
            ...contractErrors,
            ...validateFreshSubmission(assignment.form.questions, fresh, false),
         ];
         if (errors.length) return { validationErrors: errors } as const;
         const changed = await tx.registrationFormSubmission.updateMany({
            where: {
               id: response.id,
               revision: payload.revision ?? response.revision,
               status: { in: ['DRAFT', 'NEEDS_CORRECTION'] },
            },
            data: {
               revision: { increment: 1 },
               status:
                  response.status === 'NEEDS_CORRECTION'
                     ? 'NEEDS_CORRECTION'
                     : 'DRAFT',
            },
         });
         if (changed.count !== 1) return { conflict: true } as const;
         await tx.registrationFormSubmissionAnswer.deleteMany({
            where: { submissionId: response.id },
         });
         for (const answer of payload.answers)
            await tx.registrationFormSubmissionAnswer.create({
               data: {
                  submissionId: response.id,
                  formQuestionId: answer.questionId,
                  textValue:
                     answer.type === 'TEXT' || answer.type === 'TEXTAREA'
                        ? answer.value
                        : null,
                  numberValue:
                     answer.type === 'NUMBER'
                        ? new Prisma.Decimal(answer.value)
                        : null,
                  dateValue:
                     answer.type === 'DATE'
                        ? new Date(`${answer.value}T00:00:00.000Z`)
                        : null,
                  selectedOptions:
                     'optionIds' in answer
                        ? {
                             create: answer.optionIds.map((optionId) => ({
                                optionId,
                             })),
                          }
                        : 'optionId' in answer
                          ? { create: { optionId: answer.optionId } }
                          : undefined,
               },
            });
         return tx.postRegistrationFormAssignment.findUniqueOrThrow({
            where: { id: assignment.id },
            include: assignmentInclude,
         });
      });
   }
   async submit(
      registrationId: string,
      assignmentId: string,
      userId: string,
      revision: number,
      key: string,
   ) {
      return prisma.$transaction(async (tx) => {
         const assignment = await tx.postRegistrationFormAssignment.findFirst({
            where: { id: assignmentId, ...ownWhere(registrationId, userId) },
            include: assignmentInclude,
         });
         if (!assignment) return null;
         const response = assignment.response!;
         const fingerprint = createHash('sha256')
            .update(`${assignmentId}:${revision}`)
            .digest('hex');
         if (response.responseIdempotencyKey === key)
            return response.responseIdempotencyFingerprint === fingerprint
               ? assignment
               : ({ idempotencyConflict: true } as const);
         const errors = validateFreshSubmission(
            assignment.form.questions,
            response.answers,
            assignment.isRequired,
         );
         if (errors.length) return { validationErrors: errors } as const;
         const changed = await tx.registrationFormSubmission.updateMany({
            where: {
               id: response.id,
               revision,
               status: { in: ['DRAFT', 'NEEDS_CORRECTION'] },
            },
            data: {
               status: 'LOCKED',
               revision: { increment: 1 },
               submittedAt: new Date(),
               lockedAt: new Date(),
               responseIdempotencyKey: key,
               responseIdempotencyFingerprint: fingerprint,
               correctionDeadlineAt: null,
               correctionReason: null,
            },
         });
         if (changed.count !== 1) return { conflict: true } as const;
         return tx.postRegistrationFormAssignment.findUniqueOrThrow({
            where: { id: assignment.id },
            include: assignmentInclude,
         });
      });
   }
   async listInternal(
      subEventId: string,
      query: InternalPostRegistrationListQuery,
   ) {
      const where: Prisma.PostRegistrationFormAssignmentWhereInput = {
         order: { subEventId },
         ...(query.required !== undefined && { isRequired: query.required }),
         ...(query.blocksCheckIn !== undefined && {
            blocksCheckIn: query.blocksCheckIn,
         }),
         ...(query.search && {
            OR: [
               {
                  order: {
                     orderNumber: {
                        contains: query.search,
                        mode: 'insensitive',
                     },
                  },
               },
               {
                  order: {
                     buyer: {
                        name: { contains: query.search, mode: 'insensitive' },
                     },
                  },
               },
               {
                  form: {
                     name: { contains: query.search, mode: 'insensitive' },
                  },
               },
            ],
         }),
         ...(query.status === 'NOT_STARTED' && {
            response: { status: 'DRAFT', answers: { none: {} } },
         }),
         ...(query.status === 'DRAFT' && {
            response: { status: 'DRAFT', answers: { some: {} } },
         }),
         ...((query.status === 'LOCKED' ||
            query.status === 'NEEDS_CORRECTION') && {
            response: { status: query.status },
         }),
      };
      const [data, total, all] = await prisma.$transaction([
         prisma.postRegistrationFormAssignment.findMany({
            where,
            skip: (query.page - 1) * query.limit,
            take: query.limit,
            orderBy: [{ assignedAt: 'desc' }],
            include: assignmentInclude,
         }),
         prisma.postRegistrationFormAssignment.count({ where }),
         prisma.postRegistrationFormAssignment.findMany({
            where: { order: { subEventId } },
            select: {
               isRequired: true,
               blocksCheckIn: true,
               closesAt: true,
               reopenDeadlineAt: true,
               response: { select: { status: true } },
            },
         }),
      ]);
      return { data, total, all };
   }
   findInternal(id: string) {
      return prisma.postRegistrationFormAssignment.findUnique({
         where: { id },
         include: assignmentInclude,
      });
   }
   async correct(
      id: string,
      actor: string,
      revision: number,
      reason: string,
      deadline: Date,
   ) {
      return prisma.$transaction(async (tx) => {
         const assignment = await tx.postRegistrationFormAssignment.findUnique({
            where: { id },
            include: { response: true },
         });
         if (
            !assignment?.response ||
            assignment.response.revision !== revision ||
            !['LOCKED', 'SUBMITTED'].includes(assignment.response.status)
         )
            return null;
         await tx.registrationFormSubmission.update({
            where: { id: assignment.response.id },
            data: {
               status: 'NEEDS_CORRECTION',
               revision: { increment: 1 },
               lockedAt: null,
               correctionReason: reason,
               correctionDeadlineAt: deadline,
               responseIdempotencyKey: null,
               responseIdempotencyFingerprint: null,
            },
         });
         await tx.registrationStatusHistory.create({
            data: {
               registrationOrderId: assignment.registrationOrderId,
               entityType: 'POST_REGISTRATION_RESPONSE',
               entityId: assignment.response.id,
               fromStatus: assignment.response.status,
               toStatus: 'NEEDS_CORRECTION',
               actorUserId: actor,
               reason,
               metadata: { deadlineAt: deadline.toISOString() },
            },
         });
         return tx.postRegistrationFormAssignment.findUniqueOrThrow({
            where: { id },
            include: assignmentInclude,
         });
      });
   }
   async reopen(
      id: string,
      actor: string,
      revision: number,
      reason: string,
      deadline: Date,
   ) {
      return prisma.$transaction(async (tx) => {
         const assignment = await tx.postRegistrationFormAssignment.findUnique({
            where: { id },
            include: {
               response: { include: { answers: { select: { id: true } } } },
            },
         });
         if (
            !assignment?.response ||
            assignment.response.revision !== revision ||
            assignment.response.status !== 'DRAFT'
         )
            return null;
         const changed = await tx.postRegistrationFormAssignment.update({
            where: { id },
            data: {
               reopenReason: reason,
               reopenDeadlineAt: deadline,
               reopenedAt: new Date(),
               reopenedBy: actor,
            },
         });
         await tx.registrationStatusHistory.create({
            data: {
               registrationOrderId: assignment.registrationOrderId,
               entityType: 'POST_REGISTRATION_ASSIGNMENT',
               entityId: id,
               fromStatus: assignment.response.answers.length
                  ? 'DRAFT_OVERDUE'
                  : 'NOT_STARTED_OVERDUE',
               toStatus: 'REOPENED',
               actorUserId: actor,
               reason,
               metadata: { deadlineAt: deadline.toISOString() },
            },
         });
         return changed;
      });
   }
   isMemberBlocked(memberId: string, now = new Date()) {
      return prisma.postRegistrationFormAssignment
         .count({
            where: {
               orderMemberId: memberId,
               isRequired: true,
               blocksCheckIn: true,
               OR: [{ opensAt: null }, { opensAt: { lte: now } }],
               response: { status: { notIn: ['LOCKED', 'SUBMITTED'] } },
            },
         })
         .then((count) => count > 0);
   }
}
export const postRegistrationFormRepository =
   new PostRegistrationFormRepository();
export const isMemberBlockedByPostRegistration = (
   memberId: string,
   now?: Date,
) => postRegistrationFormRepository.isMemberBlocked(memberId, now);
