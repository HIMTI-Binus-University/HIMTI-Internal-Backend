import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '@/config/prisma.js';
import { AppError } from '@/utils/appError.js';
import type {
   EventRegistrationListQuery,
   InternalEventRegistrationListQuery,
   ValidatedAnswer,
} from './eventRegistrationTypes.js';
import {
   resolveRegistrationProfile,
   validateRegistrationAnswers,
   type ReplaceRegistrationAnswersRequest,
} from './eventRegistrationTypes.js';

const equalHashes = (left: string, right: string) => {
   const leftBuffer = Buffer.from(left, 'hex');
   const rightBuffer = Buffer.from(right, 'hex');
   return (
      leftBuffer.length === rightBuffer.length &&
      timingSafeEqual(leftBuffer, rightBuffer)
   );
};

const formInclude = {
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

const orderInclude = {
   event: {
      select: {
         id: true,
         name: true,
         startsAt: true,
         endsAt: true,
         cancellationClosesAt: true,
      },
   },
   ticketPackage: {
      select: { id: true, code: true, name: true, seatCount: true },
   },
   members: {
      select: {
         id: true,
         userId: true,
         status: true,
         position: true,
         user: {
            select: {
               name: true,
               email: true,
               outlookEmail: true,
               outlookEmailVerified: true,
               phoneNumber: true,
               nim: true,
               memberType: true,
               institutionType: true,
               universityName: true,
               studyProgramName: true,
               department: true,
               affiliation: true,
               registrationCompletedAt: true,
               university: { select: { name: true } },
               studyProgram: { select: { name: true } },
               region: { select: { name: true } },
            },
         },
         supplementalRevision: true,
         supplementalRequests: {
            include: {
               question: {
                  include: {
                     options: { orderBy: { orderIndex: 'asc' as const } },
                  },
               },
            },
            orderBy: { createdAt: 'asc' as const },
         },
         snapshotName: true,
         snapshotNim: true,
         snapshotOutlookEmail: true,
         snapshotEmail: true,
         snapshotUniversity: true,
         snapshotStudyProgram: true,
         snapshotRegion: true,
         snapshotPhoneNumber: true,
         snapshotAt: true,
         submissions: {
            select: {
               id: true,
               registrationFormId: true,
               formVersion: true,
               status: true,
               submittedAt: true,
               form: { include: formInclude },
               answers: {
                  select: {
                     formQuestionId: true,
                     textValue: true,
                     numberValue: true,
                     dateValue: true,
                     selectedOptions: {
                        select: { option: { select: { value: true } } },
                     },
                  },
               },
            },
         },
         ticket: {
            select: { id: true, status: true, issuedAt: true, expiresAt: true },
         },
      },
   },
   capacityHold: {
      select: { status: true, quantity: true, expiresAt: true },
   },
   payment: {
      select: {
         id: true,
         status: true,
         currency: true,
         amountMinor: true,
         bankSnapshot: true,
         expiresAt: true,
      },
   },
} satisfies Prisma.RegistrationOrderInclude;

const internalDetailInclude = {
   event: {
      select: {
         id: true,
         name: true,
         startsAt: true,
         endsAt: true,
         cancellationClosesAt: true,
      },
   },
   ticketPackage: {
      select: { id: true, code: true, name: true, seatCount: true },
   },
   members: {
      orderBy: { position: 'asc' as const },
      select: {
         id: true,
         userId: true,
         status: true,
         position: true,
         supplementalRevision: true,
         snapshotName: true,
         snapshotNim: true,
         snapshotOutlookEmail: true,
         snapshotEmail: true,
         snapshotUniversity: true,
         snapshotStudyProgram: true,
         snapshotRegion: true,
         snapshotPhoneNumber: true,
         snapshotAt: true,
         user: { select: { name: true, email: true } },
         supplementalRequests: {
            orderBy: { createdAt: 'asc' as const },
            select: {
               id: true,
               answer: true,
               answeredAt: true,
               withdrawnAt: true,
               question: {
                  select: {
                     id: true,
                     logicalId: true,
                     fieldKey: true,
                     label: true,
                     type: true,
                     isRequired: true,
                     orderIndex: true,
                     options: {
                        orderBy: { orderIndex: 'asc' as const },
                        select: {
                           id: true,
                           label: true,
                           value: true,
                           orderIndex: true,
                        },
                     },
                  },
               },
            },
         },
         submissions: {
            orderBy: { createdAt: 'desc' as const },
            select: {
               id: true,
               registrationFormId: true,
               formVersion: true,
               status: true,
               submittedAt: true,
               form: { include: formInclude },
               answers: {
                  select: {
                     formQuestionId: true,
                     textValue: true,
                     numberValue: true,
                     dateValue: true,
                     selectedOptions: {
                        select: {
                           option: { select: { label: true, value: true } },
                        },
                     },
                  },
               },
            },
         },
         ticket: {
            select: { id: true, status: true, issuedAt: true, expiresAt: true },
         },
      },
   },
   capacityHold: {
      select: { status: true, quantity: true, expiresAt: true },
   },
} satisfies Prisma.RegistrationOrderInclude;

const createAnswers = (answers: ValidatedAnswer[]) =>
   answers.map((answer) => ({
      formQuestionId: answer.questionId,
      textValue: answer.textValue,
      numberValue: answer.numberValue,
      dateValue: answer.dateValue,
      selectedOptions: {
         create: answer.optionIds.map((optionId) => ({ optionId })),
      },
   }));

class EventRegistrationRepository {
   supplementalTracking(eventId: string, query: EventRegistrationListQuery) {
      return prisma.registrationOrderMember.findMany({
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
            supplementalRequests: {
               some: {
                  answeredAt: null,
                  withdrawnAt: null,
                  question: { isRequired: true },
               },
            },
         },
         select: {
            id: true,
            registrationOrderId: true,
            user: { select: { name: true, email: true } },
            supplementalRequests: {
               where: {
                  answeredAt: null,
                  withdrawnAt: null,
                  question: { isRequired: true },
               },
               select: { id: true, question: { select: { label: true } } },
            },
         },
         orderBy: { id: 'asc' },
         skip: (query.page - 1) * query.limit,
         take: query.limit,
      });
   }

   saveSupplemental(
      id: string,
      userId: string,
      body: ReplaceRegistrationAnswersRequest,
   ) {
      return prisma.$transaction(async (tx) => {
         const scope = await tx.registrationOrder.findFirst({
            where: { id, members: { some: { userId } } },
            select: { eventId: true },
         });
         if (!scope) throw new AppError('Registration not found', 404);
         await tx.$queryRaw`SELECT id FROM events WHERE id = ${scope.eventId} FOR UPDATE`;
         await tx.$queryRaw`SELECT id FROM registration_orders WHERE id = ${id} FOR UPDATE`;
         const member = await tx.registrationOrderMember.findFirst({
            where: {
               registrationOrderId: id,
               userId,
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
            include: {
               supplementalRequests: {
                  where: { withdrawnAt: null, answeredAt: null },
                  include: { question: { include: { options: true } } },
               },
            },
         });
         if (!member) throw new AppError('Active registration not found', 404);
         if (member.supplementalRevision !== body.expectedRevision)
            throw new AppError(
               'Additional questions changed. Reload before saving.',
               409,
               'REVISION_CONFLICT',
            );
         let validated;
         try {
            validated = validateRegistrationAnswers(
               member.supplementalRequests.map((r) => r.question),
               body.answers,
            );
         } catch (error) {
            throw new AppError(
               error instanceof Error ? error.message : 'Invalid answers',
               400,
            );
         }
         for (const answer of validated.answers) {
            if (
               answer.textValue === null &&
               answer.numberValue === null &&
               answer.dateValue === null &&
               !answer.optionIds.length
            )
               continue;
            const request = member.supplementalRequests.find(
               (r) => r.questionId === answer.questionId,
            )!;
            await tx.supplementalQuestionRequest.update({
               where: { id: request.id },
               data: {
                  answer: body.answers.find(
                     (a) => a.questionId === answer.questionId,
                  )!.value as Prisma.InputJsonValue,
                  answeredAt: new Date(),
               },
            });
         }
         await tx.registrationOrderMember.update({
            where: { id: member.id },
            data: { supplementalRevision: { increment: 1 } },
         });
      });
   }
   context(eventId: string) {
      const now = new Date();
      return prisma.event.findFirst({
         where: { id: eventId, status: 'PUBLISHED' },
         select: {
            id: true,
            name: true,
            isRegistrationOpen: true,
            registrationOpensAt: true,
            registrationClosesAt: true,
            capacity: true,
            paymentCurrency: true,
            ticketPackages: {
               where: {
                  status: 'ACTIVE',
                  OR: [{ salesStartAt: null }, { salesStartAt: { lte: now } }],
                  AND: [
                     {
                        OR: [{ salesEndAt: null }, { salesEndAt: { gt: now } }],
                     },
                  ],
               },
               orderBy: { createdAt: 'asc' },
               select: {
                  id: true,
                  code: true,
                  name: true,
                  description: true,
                  seatCount: true,
                  currency: true,
                  priceMinor: true,
                  salesStartAt: true,
                  salesEndAt: true,
               },
            },
            registrationForms: {
               where: { status: 'PUBLISHED' },
               take: 1,
               orderBy: { version: 'desc' },
               include: formInclude,
            },
         },
      });
   }

   profile(userId: string) {
      return prisma.user.findUnique({
         where: { id: userId },
         select: {
            name: true,
            email: true,
            outlookEmail: true,
            outlookEmailVerified: true,
            phoneNumber: true,
            nim: true,
            memberType: true,
            institutionType: true,
            universityName: true,
            studyProgramName: true,
            department: true,
            affiliation: true,
            registrationCompletedAt: true,
            university: { select: { name: true } },
            studyProgram: { select: { name: true } },
            region: { select: { name: true } },
         },
      });
   }

   form(id: string) {
      return prisma.registrationForm.findUnique({
         where: { id },
         include: formInclude,
      });
   }

   activeForEvent(eventId: string, userId: string) {
      return prisma.registrationOrder.findFirst({
         where: {
            eventId,
            members: { some: { userId, status: { in: ['ACTIVE', 'LOCKED'] } } },
            status: {
               in: [
                  'ASSEMBLING',
                  'PENDING_PAYMENT',
                  'PAYMENT_REVIEW',
                  'CONFIRMED',
               ],
            },
         },
         include: orderInclude,
      });
   }

   async create(
      eventId: string,
      packageId: string,
      formId: string,
      userId: string,
      answers: ValidatedAnswer[],
   ) {
      return prisma.$transaction(
         async (tx) => {
            await tx.$queryRaw`SELECT id FROM events WHERE id = ${eventId} FOR UPDATE`;
            const event = await tx.event.findFirst({
               where: { id: eventId, status: 'PUBLISHED' },
            });
            if (!event) return { result: 'EVENT_NOT_FOUND' as const };
            const now = new Date();
            if (
               !event.isRegistrationOpen ||
               (event.registrationOpensAt && event.registrationOpensAt > now) ||
               (event.registrationClosesAt && event.registrationClosesAt <= now)
            )
               return { result: 'REGISTRATION_CLOSED' as const };
            const ticketPackage = await tx.ticketPackage.findFirst({
               where: {
                  id: packageId,
                  eventId,
                  status: 'ACTIVE',
                  seatCount: 1,
                  OR: [{ salesStartAt: null }, { salesStartAt: { lte: now } }],
                  AND: [
                     {
                        OR: [{ salesEndAt: null }, { salesEndAt: { gt: now } }],
                     },
                  ],
               },
            });
            if (!ticketPackage) return { result: 'PACKAGE_NOT_FOUND' as const };
            const [confirmed, held] = await Promise.all([
               tx.registrationOrder.aggregate({
                  where: { eventId, status: 'CONFIRMED' },
                  _sum: { seatCount: true },
               }),
               tx.registrationCapacityHold.aggregate({
                  where: {
                     eventId,
                     status: 'ACTIVE',
                     expiresAt: { gt: now },
                  },
                  _sum: { quantity: true },
               }),
            ]);
            if (
               event.capacity !== null &&
               (confirmed._sum.seatCount ?? 0) + (held._sum.quantity ?? 0) >=
                  event.capacity
            )
               return { result: 'SOLD_OUT' as const };
            if (
               ticketPackage.priceMinor > 0n &&
               (!event.paymentBankName ||
                  !event.paymentAccountNumber ||
                  !event.paymentAccountHolder)
            )
               return { result: 'PAYMENT_UNCONFIGURED' as const };
            const form = await tx.registrationForm.findFirst({
               where: { id: formId, eventId, status: 'PUBLISHED' },
            });
            if (!form) return { result: 'FORM_NOT_FOUND' as const };
            const duplicate = await tx.registrationOrder.findFirst({
               where: {
                  eventId,
                  members: {
                     some: { userId, status: { in: ['ACTIVE', 'LOCKED'] } },
                  },
                  status: {
                     in: [
                        'ASSEMBLING',
                        'PENDING_PAYMENT',
                        'PAYMENT_REVIEW',
                        'CONFIRMED',
                     ],
                  },
               },
               select: { id: true },
            });
            if (duplicate) return { result: 'DUPLICATE' as const };
            const order = await tx.registrationOrder.create({
               data: {
                  orderNumber: `EV-${Date.now()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
                  eventId,
                  ticketPackageId: packageId,
                  seatCount: 1,
                  currency: ticketPackage.currency,
                  subtotalMinor: ticketPackage.priceMinor,
                  totalMinor: ticketPackage.priceMinor,
                  members: {
                     create: {
                        eventId,
                        userId,
                        position: 1,
                        submissions: {
                           create: {
                              registrationFormId: form.id,
                              formVersion: form.version,
                              answers: { create: createAnswers(answers) },
                           },
                        },
                     },
                  },
               },
            });
            await tx.registrationStatusHistory.create({
               data: {
                  registrationOrderId: order.id,
                  actorUserId: userId,
                  entityType: 'ORDER',
                  entityId: order.id,
                  toStatus: 'ASSEMBLING',
                  reason: 'Individual registration created',
               },
            });
            return { result: 'CREATED' as const, orderId: order.id };
         },
         { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
   }

   async createBundle(
      eventId: string,
      packageId: string,
      formId: string,
      userId: string,
      bundleCodeHash: string,
      bundleCodeEncrypted: string,
      answers: ValidatedAnswer[],
   ) {
      return prisma.$transaction(
         async (tx) => {
            await tx.$queryRaw`SELECT id FROM events WHERE id = ${eventId} FOR UPDATE`;
            const replay = await tx.registrationOrder.findFirst({
               where: {
                  eventId,
                  ticketPackageId: packageId,
                  bundleCodeHash,
                  members: { some: { userId } },
               },
               select: { id: true },
            });
            if (replay)
               return { result: 'CREATED' as const, orderId: replay.id };
            const now = new Date();
            const event = await tx.event.findFirst({
               where: { id: eventId, status: 'PUBLISHED' },
            });
            if (!event) return { result: 'EVENT_NOT_FOUND' as const };
            if (
               !event.isRegistrationOpen ||
               (event.registrationOpensAt && event.registrationOpensAt > now) ||
               (event.registrationClosesAt && event.registrationClosesAt <= now)
            )
               return { result: 'REGISTRATION_CLOSED' as const };
            const ticketPackage = await tx.ticketPackage.findFirst({
               where: {
                  id: packageId,
                  eventId,
                  status: 'ACTIVE',
                  seatCount: { gt: 1 },
                  OR: [{ salesStartAt: null }, { salesStartAt: { lte: now } }],
                  AND: [
                     {
                        OR: [{ salesEndAt: null }, { salesEndAt: { gt: now } }],
                     },
                  ],
               },
            });
            if (!ticketPackage) return { result: 'PACKAGE_NOT_FOUND' as const };
            if (
               ticketPackage.priceMinor > 0n &&
               (!event.paymentBankName ||
                  !event.paymentAccountNumber ||
                  !event.paymentAccountHolder)
            )
               return { result: 'PAYMENT_UNCONFIGURED' as const };
            const form = await tx.registrationForm.findFirst({
               where: { id: formId, eventId, status: 'PUBLISHED' },
            });
            if (!form) return { result: 'FORM_NOT_FOUND' as const };
            const duplicate = await tx.registrationOrderMember.findFirst({
               where: { eventId, userId, status: { in: ['ACTIVE', 'LOCKED'] } },
               include: {
                  order: { select: { id: true, bundleCodeHash: true } },
               },
            });
            if (duplicate)
               return duplicate.order.bundleCodeHash &&
                  equalHashes(duplicate.order.bundleCodeHash, bundleCodeHash)
                  ? { result: 'CREATED' as const, orderId: duplicate.order.id }
                  : { result: 'DUPLICATE' as const };
            const order = await tx.registrationOrder.create({
               data: {
                  orderNumber: `EV-${Date.now()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
                  eventId,
                  ticketPackageId: packageId,
                  seatCount: ticketPackage.seatCount,
                  currency: ticketPackage.currency,
                  subtotalMinor: ticketPackage.priceMinor,
                  totalMinor: ticketPackage.priceMinor,
                  bundleCodeHash,
                  bundleCodeEncrypted,
                  members: {
                     create: {
                        eventId,
                        userId,
                        position: 1,
                        submissions: {
                           create: {
                              registrationFormId: form.id,
                              formVersion: form.version,
                              answers: { create: createAnswers(answers) },
                           },
                        },
                     },
                  },
               },
               include: { members: { select: { id: true } } },
            });
            await tx.bundleMembershipAudit.create({
               data: {
                  registrationOrderId: order.id,
                  orderMemberId: order.members[0]!.id,
                  subjectUserId: userId,
                  actorUserId: userId,
                  action: 'JOINED',
               },
            });
            await tx.registrationStatusHistory.create({
               data: {
                  registrationOrderId: order.id,
                  actorUserId: userId,
                  entityType: 'ORDER',
                  entityId: order.id,
                  toStatus: 'ASSEMBLING',
                  reason: 'Bundle registration created',
               },
            });
            return { result: 'CREATED' as const, orderId: order.id };
         },
         { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
   }

   async joinBundle(
      eventId: string,
      packageId: string,
      bundleCodeHash: string,
      userId: string,
   ) {
      return prisma.$transaction(
         async (tx) => {
            const candidate = await tx.registrationOrder.findUnique({
               where: { bundleCodeHash },
               select: { id: true },
            });
            if (!candidate) return { result: 'UNAVAILABLE' as const };
            await tx.$queryRaw`SELECT id FROM registration_orders WHERE id = ${candidate.id} FOR UPDATE`;
            const existingMember = await tx.registrationOrderMember.findFirst({
               where: {
                  registrationOrderId: candidate.id,
                  eventId,
                  userId,
                  status: { in: ['ACTIVE', 'LOCKED'] },
                  order: { ticketPackageId: packageId },
               },
            });
            if (existingMember)
               return { result: 'JOINED' as const, orderId: candidate.id };
            const now = new Date();
            const order = await tx.registrationOrder.findFirst({
               where: {
                  id: candidate.id,
                  eventId,
                  ticketPackageId: packageId,
                  status: 'ASSEMBLING',
                  event: {
                     status: 'PUBLISHED',
                     isRegistrationOpen: true,
                     OR: [
                        { registrationOpensAt: null },
                        { registrationOpensAt: { lte: now } },
                     ],
                     AND: [
                        {
                           OR: [
                              { registrationClosesAt: null },
                              { registrationClosesAt: { gt: now } },
                           ],
                        },
                     ],
                  },
                  ticketPackage: {
                     status: 'ACTIVE',
                     seatCount: { gt: 1 },
                     OR: [
                        { salesStartAt: null },
                        { salesStartAt: { lte: now } },
                     ],
                     AND: [
                        {
                           OR: [
                              { salesEndAt: null },
                              { salesEndAt: { gt: now } },
                           ],
                        },
                     ],
                  },
               },
               include: {
                  members: {
                     orderBy: { position: 'asc' },
                     include: {
                        submissions: {
                           select: {
                              registrationFormId: true,
                              formVersion: true,
                           },
                        },
                     },
                  },
               },
            });
            const activeMembers = order?.members.filter(
               ({ status }) => status === 'ACTIVE',
            );
            if (
               !order ||
               !activeMembers ||
               activeMembers.length >= order.seatCount
            )
               return { result: 'UNAVAILABLE' as const };
            const duplicate = await tx.registrationOrderMember.findFirst({
               where: { eventId, userId, status: { in: ['ACTIVE', 'LOCKED'] } },
            });
            if (duplicate) return { result: 'DUPLICATE' as const };
            const previous = order.members.find(
               (member) => member.userId === userId,
            );
            const occupied = new Set(
               activeMembers.map(({ position }) => position),
            );
            const nextPosition = Array.from(
               { length: order.seatCount },
               (_, position) => position + 1,
            ).find((position) => !occupied.has(position))!;
            const pinned = order.members[0]?.submissions[0];
            const form = pinned
               ? await tx.registrationForm.findFirst({
                    where: {
                       id: pinned.registrationFormId,
                       eventId,
                       version: pinned.formVersion,
                    },
                 })
               : null;
            if (!form) return { result: 'UNAVAILABLE' as const };
            const member = previous
               ? await tx.registrationOrderMember.update({
                    where: { id: previous.id },
                    data: { status: 'ACTIVE', position: nextPosition },
                 })
               : await tx.registrationOrderMember.create({
                    data: {
                       registrationOrderId: order.id,
                       eventId,
                       userId,
                       position: nextPosition,
                       submissions: {
                          create: {
                             registrationFormId: form.id,
                             formVersion: form.version,
                          },
                       },
                    },
                 });
            await tx.registrationOrder.update({
               where: { id: order.id },
               data: { revision: { increment: 1 } },
            });
            await tx.bundleMembershipAudit.create({
               data: {
                  registrationOrderId: order.id,
                  orderMemberId: member.id,
                  subjectUserId: userId,
                  actorUserId: userId,
                  action: 'JOINED',
               },
            });
            return { result: 'JOINED' as const, orderId: order.id };
         },
         { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
   }

   async replaceBundleCode(
      id: string,
      userId: string,
      expectedRevision: number,
      bundleCodeHash: string,
      bundleCodeEncrypted: string,
   ) {
      return prisma.$transaction(async (tx) => {
         await tx.$queryRaw`SELECT id FROM registration_orders WHERE id = ${id} FOR UPDATE`;
         const order = await tx.registrationOrder.findFirst({
            where: {
               id,
               seatCount: { gt: 1 },
               members: {
                  some: { userId, status: { in: ['ACTIVE', 'LOCKED'] } },
               },
            },
         });
         if (!order) return { result: 'NOT_FOUND' as const };
         if (order.revision !== expectedRevision)
            return { result: 'REVISION_CONFLICT' as const };
         await tx.registrationOrder.update({
            where: { id },
            data: {
               bundleCodeHash,
               bundleCodeEncrypted,
               revision: { increment: 1 },
            },
         });
         return { result: 'REPLACED' as const };
      });
   }

   async changeBundleMember(
      id: string,
      subjectUserId: string,
      actorUserId: string,
      expectedRevision: number,
      organizer: boolean,
      reason?: string,
      expectedEventId?: string,
   ) {
      return prisma.$transaction(async (tx) => {
         await tx.$queryRaw`SELECT id FROM registration_orders WHERE id = ${id} FOR UPDATE`;
         const order = await tx.registrationOrder.findFirst({
            where: { id, ...(expectedEventId && { eventId: expectedEventId }) },
            include: {
               members: true,
            },
         });
         if (!order) return { result: 'NOT_FOUND' as const };
         if (order.revision !== expectedRevision)
            return { result: 'REVISION_CONFLICT' as const };
         if (order.status !== 'ASSEMBLING' || order.seatCount <= 1)
            return { result: 'LOCKED' as const };
         const member = order.members.find(
            ({ userId, status }) =>
               userId === subjectUserId && status === 'ACTIVE',
         );
         if (!member) return { result: 'NOT_FOUND' as const };
         await tx.registrationOrderMember.update({
            where: { id: member.id },
            data: {
               status: organizer ? 'REMOVED' : 'LEFT',
               position:
                  Math.max(...order.members.map(({ position }) => position)) +
                  1,
            },
         });
         await tx.registrationOrder.update({
            where: { id },
            data: { revision: { increment: 1 } },
         });
         await tx.bundleMembershipAudit.create({
            data: {
               registrationOrderId: id,
               orderMemberId: member.id,
               subjectUserId,
               actorUserId,
               action: organizer ? 'REMOVED_BY_ORGANIZER' : 'LEFT',
               reason,
            },
         });
         return { result: 'CHANGED' as const, eventId: order.eventId };
      });
   }

   internalList(eventId: string, query: EventRegistrationListQuery) {
      return prisma.registrationOrder.findMany({
         where: { eventId, seatCount: { gt: 1 } },
         select: {
            id: true,
            orderNumber: true,
            status: true,
            revision: true,
            seatCount: true,
            currency: true,
            totalMinor: true,
            createdAt: true,
            ticketPackage: { select: { id: true, name: true } },
            members: {
               where: { status: { in: ['ACTIVE', 'LOCKED'] } },
               orderBy: { position: 'asc' },
               select: {
                  id: true,
                  userId: true,
                  position: true,
                  status: true,
                  user: { select: { name: true, email: true } },
                  submissions: { select: { status: true } },
               },
            },
         },
         orderBy: { createdAt: 'desc' },
         skip: (query.page - 1) * query.limit,
         take: query.limit,
      });
   }

   async internalRegistrations(
      eventId: string,
      query: InternalEventRegistrationListQuery,
   ) {
      const where: Prisma.RegistrationOrderWhereInput = {
         eventId,
         status: query.status,
         ...(query.kind === 'INDIVIDUAL' && { seatCount: 1 }),
         ...(query.kind === 'BUNDLE' && { seatCount: { gt: 1 } }),
      };
      const [data, totalRecords] = await prisma.$transaction([
         prisma.registrationOrder.findMany({
            where,
            select: {
               id: true,
               orderNumber: true,
               status: true,
               revision: true,
               seatCount: true,
               currency: true,
               totalMinor: true,
               paymentDeadlineAt: true,
               confirmedAt: true,
               createdAt: true,
               ticketPackage: { select: { id: true, name: true } },
               _count: {
                  select: {
                     members: {
                        where: { status: { in: ['ACTIVE', 'LOCKED'] } },
                     },
                  },
               },
            },
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
            skip: (query.page - 1) * query.limit,
            take: query.limit,
         }),
         prisma.registrationOrder.count({ where }),
      ]);
      return { data, totalRecords };
   }

   internalRegistration(eventId: string, id: string) {
      return prisma.registrationOrder.findFirst({
         where: { id, eventId },
         include: internalDetailInclude,
      });
   }

   owned(id: string, userId: string) {
      return prisma.registrationOrder.findFirst({
         where: {
            id,
            members: { some: { userId, status: { in: ['ACTIVE', 'LOCKED'] } } },
         },
         include: orderInclude,
      });
   }

   async list(userId: string, query: EventRegistrationListQuery) {
      const where: Prisma.RegistrationOrderWhereInput = {
         members: { some: { userId, status: { in: ['ACTIVE', 'LOCKED'] } } },
      };
      const [data, total] = await prisma.$transaction([
         prisma.registrationOrder.findMany({
            where,
            select: { id: true, eventId: true, status: true },
            orderBy: { createdAt: 'desc' },
            skip: (query.page - 1) * query.limit,
            take: query.limit,
         }),
         prisma.registrationOrder.count({ where }),
      ]);
      return { data, total };
   }

   async replaceAnswers(
      id: string,
      userId: string,
      expectedRevision: number,
      answers: ValidatedAnswer[],
   ) {
      return prisma.$transaction(
         async (tx) => {
            await tx.$queryRaw`SELECT id FROM registration_orders WHERE id = ${id} FOR UPDATE`;
            const order = await tx.registrationOrder.findFirst({
               where: {
                  id,
                  members: {
                     some: { userId, status: { in: ['ACTIVE', 'LOCKED'] } },
                  },
               },
               include: {
                  members: {
                     where: { userId, status: 'ACTIVE' },
                     include: { submissions: true },
                  },
               },
            });
            if (!order) return { result: 'NOT_FOUND' as const };
            if (order.revision !== expectedRevision)
               return { result: 'REVISION_CONFLICT' as const };
            if (order.status !== 'ASSEMBLING')
               return { result: 'LOCKED' as const };
            const submission = order.members[0]?.submissions[0];
            if (!submission) return { result: 'NOT_FOUND' as const };
            if (
               order.members[0]?.status !== 'ACTIVE' ||
               submission.status !== 'DRAFT'
            )
               return { result: 'LOCKED' as const };
            await tx.registrationFormSubmissionAnswer.deleteMany({
               where: { submissionId: submission.id },
            });
            if (answers.length)
               await tx.registrationFormSubmissionAnswer.createMany({
                  data: answers.map((answer) => ({
                     submissionId: submission.id,
                     formQuestionId: answer.questionId,
                     textValue: answer.textValue,
                     numberValue: answer.numberValue,
                     dateValue: answer.dateValue,
                  })),
               });
            for (const answer of answers)
               if (answer.optionIds.length) {
                  const stored =
                     await tx.registrationFormSubmissionAnswer.findUniqueOrThrow(
                        {
                           where: {
                              submissionId_formQuestionId: {
                                 submissionId: submission.id,
                                 formQuestionId: answer.questionId,
                              },
                           },
                        },
                     );
                  await tx.registrationFormSelectedOption.createMany({
                     data: answer.optionIds.map((optionId) => ({
                        answerId: stored.id,
                        optionId,
                     })),
                  });
               }
            await tx.registrationOrder.update({
               where: { id },
               data: { revision: { increment: 1 } },
            });
            return { result: 'UPDATED' as const };
         },
         { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
   }

   async finalize(id: string, userId: string) {
      return prisma.$transaction(
         async (tx) => {
            const current = await tx.registrationOrder.findUnique({
               where: { id },
               select: { eventId: true },
            });
            if (!current) return { result: 'NOT_FOUND' as const };
            await tx.$queryRaw`SELECT id FROM events WHERE id = ${current.eventId} FOR UPDATE`;
            await tx.$queryRaw`SELECT id FROM registration_orders WHERE id = ${id} FOR UPDATE`;
            const order = await tx.registrationOrder.findFirst({
               where: {
                  id,
                  status: 'ASSEMBLING',
                  members: {
                     some: { userId, status: { in: ['ACTIVE', 'LOCKED'] } },
                  },
               },
               include: {
                  event: true,
                  ticketPackage: true,
                  members: {
                     where: { status: 'ACTIVE' },
                     include: {
                        user: {
                           select: {
                              name: true,
                              email: true,
                              outlookEmail: true,
                              outlookEmailVerified: true,
                              phoneNumber: true,
                              nim: true,
                              memberType: true,
                              institutionType: true,
                              universityName: true,
                              studyProgramName: true,
                              department: true,
                              affiliation: true,
                              registrationCompletedAt: true,
                              university: { select: { name: true } },
                              studyProgram: { select: { name: true } },
                              region: { select: { name: true } },
                           },
                        },
                        submissions: {
                           include: {
                              form: { include: formInclude },
                              answers: true,
                           },
                        },
                     },
                  },
               },
            });
            if (!order) return { result: 'NOT_READY' as const };
            if (order.members.length !== order.seatCount)
               return { result: 'NOT_READY' as const };
            const profiles = order.members.map(({ user }) =>
               resolveRegistrationProfile(user),
            );
            if (profiles.some(({ complete }) => !complete))
               return { result: 'NOT_READY' as const };
            for (const member of order.members) {
               const submission = member.submissions[0];
               if (!submission || submission.status !== 'DRAFT')
                  return { result: 'NOT_READY' as const };
               const requiredIds = submission.form.sections.flatMap(
                  ({ questions }) =>
                     questions
                        .filter(({ isRequired }) => isRequired)
                        .map(({ id }) => id),
               );
               const answeredIds = new Set(
                  submission.answers
                     .filter(
                        (answer) =>
                           answer.textValue !== null ||
                           answer.numberValue !== null ||
                           answer.dateValue !== null,
                     )
                     .map(({ formQuestionId }) => formQuestionId),
               );
               const selected =
                  await tx.registrationFormSelectedOption.findMany({
                     where: { answer: { submissionId: submission.id } },
                     select: { answer: { select: { formQuestionId: true } } },
                  });
               selected.forEach(({ answer }) =>
                  answeredIds.add(answer.formQuestionId),
               );
               if (
                  !requiredIds.every((questionId) =>
                     answeredIds.has(questionId),
                  )
               )
                  return { result: 'NOT_READY' as const };
            }
            const now = new Date();
            if (
               order.event.status !== 'PUBLISHED' ||
               !order.event.isRegistrationOpen ||
               (order.event.registrationOpensAt &&
                  order.event.registrationOpensAt > now) ||
               (order.event.registrationClosesAt &&
                  order.event.registrationClosesAt <= now) ||
               order.ticketPackage.status !== 'ACTIVE' ||
               (order.ticketPackage.salesStartAt &&
                  order.ticketPackage.salesStartAt > now) ||
               (order.ticketPackage.salesEndAt &&
                  order.ticketPackage.salesEndAt <= now)
            )
               return { result: 'NOT_READY' as const };
            const confirmed = await tx.registrationOrder.aggregate({
               where: { eventId: order.eventId, status: 'CONFIRMED' },
               _sum: { seatCount: true },
            });
            const held = await tx.registrationCapacityHold.aggregate({
               where: {
                  eventId: order.eventId,
                  status: 'ACTIVE',
                  expiresAt: { gt: now },
               },
               _sum: { quantity: true },
            });
            if (
               order.event.capacity !== null &&
               (confirmed._sum.seatCount ?? 0) +
                  (held._sum.quantity ?? 0) +
                  order.seatCount >
                  order.event.capacity
            )
               return { result: 'SOLD_OUT' as const };
            for (const [index, member] of order.members.entries()) {
               const snapshot = profiles[index]!.values;
               await tx.registrationOrderMember.update({
                  where: { id: member.id },
                  data: {
                     status: 'LOCKED',
                     snapshotName: snapshot.name,
                     snapshotNim: snapshot.nim,
                     snapshotOutlookEmail: snapshot.outlookEmail,
                     snapshotEmail: snapshot.email,
                     snapshotUniversity: snapshot.university,
                     snapshotStudyProgram: snapshot.studyProgram,
                     snapshotRegion: snapshot.region,
                     snapshotPhoneNumber: snapshot.phoneNumber,
                     snapshotAt: now,
                  },
               });
               await tx.registrationFormSubmission.update({
                  where: { id: member.submissions[0]!.id },
                  data: { status: 'LOCKED', submittedAt: now, lockedAt: now },
               });
            }
            const paid = order.totalMinor > 0n;
            const deadlines = [
               now.getTime() + 24 * 60 * 60 * 1000,
               order.event.registrationClosesAt?.getTime(),
               order.ticketPackage.salesEndAt?.getTime(),
               order.event.startsAt?.getTime(),
            ].filter((value): value is number => value !== undefined);
            const expiresAt = new Date(Math.min(...deadlines));
            const status = paid ? 'PENDING_PAYMENT' : 'CONFIRMED';
            await tx.registrationOrder.update({
               where: { id },
               data: {
                  status,
                  revision: { increment: 1 },
                  paymentDeadlineAt: paid ? expiresAt : null,
                  confirmedAt: paid ? null : now,
               },
            });
            if (paid) {
               await tx.registrationCapacityHold.create({
                  data: {
                     registrationOrderId: id,
                     eventId: order.eventId,
                     quantity: order.seatCount,
                     expiresAt,
                  },
               });
               await tx.registrationPayment.create({
                  data: {
                     registrationOrderId: id,
                     currency: order.currency,
                     amountMinor: order.totalMinor,
                     expiresAt,
                     bankSnapshot: {
                        bankName: order.event.paymentBankName,
                        accountNumber: order.event.paymentAccountNumber,
                        accountHolder: order.event.paymentAccountHolder,
                        instructions: order.event.paymentInstructions,
                     },
                  },
               });
            } else {
               await tx.registrationTicket.createMany({
                  data: order.members.map(({ id: orderMemberId }) => ({
                     eventId: order.eventId,
                     orderMemberId,
                     tokenHash: createHash('sha256')
                        .update(randomBytes(32))
                        .digest('hex'),
                  })),
               });
            }
            await tx.registrationStatusHistory.create({
               data: {
                  registrationOrderId: id,
                  actorUserId: userId,
                  entityType: 'ORDER',
                  entityId: id,
                  fromStatus: 'ASSEMBLING',
                  toStatus: status,
                  reason: 'Registration automatically finalized',
               },
            });
            return { result: 'FINALIZED' as const };
         },
         { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
   }

   async cancel(id: string, userId: string, expectedRevision: number) {
      return prisma.$transaction(
         async (tx) => {
            const scope = await tx.registrationOrder.findFirst({
               where: {
                  id,
                  seatCount: 1,
                  members: {
                     some: { userId, status: { in: ['ACTIVE', 'LOCKED'] } },
                  },
               },
               select: { eventId: true },
            });
            if (!scope) return { result: 'NOT_FOUND' as const };
            await tx.$queryRaw`SELECT id FROM events WHERE id = ${scope.eventId} FOR UPDATE`;
            await tx.$queryRaw`SELECT id FROM registration_orders WHERE id = ${id} FOR UPDATE`;
            const order = await tx.registrationOrder.findFirst({
               where: {
                  id,
                  seatCount: 1,
                  members: {
                     some: { userId, status: { in: ['ACTIVE', 'LOCKED'] } },
                  },
               },
               include: { event: { select: { cancellationClosesAt: true } } },
            });
            if (!order) return { result: 'NOT_FOUND' as const };
            if (order.revision !== expectedRevision)
               return { result: 'REVISION_CONFLICT' as const };
            if (!['ASSEMBLING', 'PENDING_PAYMENT'].includes(order.status))
               return { result: 'LOCKED' as const };
            if (
               order.event.cancellationClosesAt &&
               order.event.cancellationClosesAt <= new Date()
            )
               return { result: 'CANCELLATION_CLOSED' as const };
            const now = new Date();
            await tx.registrationCapacityHold.updateMany({
               where: { registrationOrderId: id, status: 'ACTIVE' },
               data: { status: 'RELEASED', releasedAt: now },
            });
            await tx.registrationPayment.updateMany({
               where: { registrationOrderId: id },
               data: { status: 'CANCELLED' },
            });
            await tx.registrationTicket.updateMany({
               where: {
                  orderMember: { registrationOrderId: id },
                  status: 'ACTIVE',
               },
               data: { status: 'REVOKED', revokedAt: now },
            });
            await tx.registrationOrderMember.updateMany({
               where: {
                  registrationOrderId: id,
                  userId,
                  status: { in: ['ACTIVE', 'LOCKED'] },
               },
               data: { status: 'LEFT' },
            });
            await tx.registrationOrder.update({
               where: { id },
               data: {
                  status: 'CANCELLED',
                  cancelledAt: now,
                  revision: { increment: 1 },
               },
            });
            await tx.registrationStatusHistory.create({
               data: {
                  registrationOrderId: id,
                  actorUserId: userId,
                  entityType: 'ORDER',
                  entityId: id,
                  fromStatus: order.status,
                  toStatus: 'CANCELLED',
                  reason: 'Cancelled by participant',
               },
            });
            return { result: 'CANCELLED' as const };
         },
         { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
   }
}

export const eventRegistrationRepository = new EventRegistrationRepository();
