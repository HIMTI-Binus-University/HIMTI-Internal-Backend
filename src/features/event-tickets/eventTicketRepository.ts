import { Prisma } from '@prisma/client';
import { prisma } from '@/config/prisma.js';
import type {
   AttendanceListQuery,
   SearchTicketQuery,
} from './eventTicketTypes.js';

export const participantTicketSelect = {
   id: true,
   status: true,
   issuedAt: true,
   expiresAt: true,
   subEvent: { select: { id: true, name: true, date: true } },
   revokedAt: true,
   orderMember: {
      select: {
         id: true,
         status: true,
         order: { select: { id: true, status: true } },
         postRegistrationAssignments: {
            where: {
               audience: 'EACH_ATTENDEE',
               isRequired: true,
               blocksCheckIn: true,
            },
            orderBy: [{ orderIndex: 'asc' }, { id: 'asc' }],
            select: {
               id: true,
               registrationOrderId: true,
               opensAt: true,
               closesAt: true,
               reopenDeadlineAt: true,
               form: { select: { name: true } },
               response: {
                  select: {
                     status: true,
                     correctionDeadlineAt: true,
                     _count: { select: { answers: true } },
                  },
               },
            },
         },
      },
   },
} satisfies Prisma.RegistrationTicketSelect;
const eligibilityInclude = {
   subEvent: { select: { eventId: true, attendanceCheckoutEnabled: true } },
   orderMember: {
      select: {
         id: true,
         userId: true,
         status: true,
         user: { select: { name: true, email: true } },
         order: { select: { status: true, orderNumber: true } },
         postRegistrationAssignments: {
            where: {
               audience: 'EACH_ATTENDEE' as const,
               isRequired: true,
               blocksCheckIn: true,
            },
            select: {
               id: true,
               registrationOrderId: true,
               opensAt: true,
               closesAt: true,
               reopenDeadlineAt: true,
               form: { select: { name: true } },
               response: {
                  select: {
                     status: true,
                     correctionDeadlineAt: true,
                     _count: { select: { answers: true } },
                  },
               },
            },
         },
      },
   },
} satisfies Prisma.RegistrationTicketInclude;

class EventTicketRepository {
   listOwned(userId: string) {
      return prisma.registrationTicket.findMany({
         where: { orderMember: { userId } },
         select: participantTicketSelect,
         orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      });
   }
   findOwned(ticketId: string, userId: string, secret = false) {
      return prisma.registrationTicket.findFirst({
         where: { id: ticketId, orderMember: { userId } },
         select: {
            ...participantTicketSelect,
            orderMemberId: true,
            ...(secret && {
               tokenCiphertext: true,
               tokenIv: true,
               tokenAuthTag: true,
               keyVersion: true,
            }),
         },
      });
   }
   findEligibleByHash(subEventId: string, hash: string) {
      return prisma.registrationTicket.findFirst({
         where: { subEventId, tokenHash: hash },
         include: eligibilityInclude,
      });
   }
   findEligibleById(subEventId: string, id: string) {
      return prisma.registrationTicket.findFirst({
         where: { subEventId, id },
         include: eligibilityInclude,
      });
   }
   findSubEventScope(subEventId: string) {
      return prisma.subevent.findUnique({
         where: { id: subEventId },
         select: { eventId: true },
      });
   }

   async checkIn(
      ticketId: string,
      subEventId: string,
      operatorUserId: string,
      source: string,
   ) {
      return prisma.$transaction(
         async (tx) => {
            await tx.$queryRaw`SELECT "id" FROM "registration_tickets" WHERE "id" = ${ticketId} FOR UPDATE`;
            const existing = await tx.attendanceCheckIn.findFirst({
               where: { ticketId, voidedAt: null },
               orderBy: [{ checkedInAt: 'desc' }, { id: 'desc' }],
            });
            if (existing)
               return {
                  record: existing,
                  state: existing.checkedOutAt
                     ? ('CHECKED_OUT' as const)
                     : ('CHECKED_IN' as const),
                  replay: true,
               };
            try {
               const record = await tx.attendanceCheckIn.create({
                  data: { ticketId, subEventId, operatorUserId, source },
               });
               await tx.registrationTicket.updateMany({
                  where: { id: ticketId, status: 'ACTIVE' },
                  data: { status: 'USED' },
               });
               await tx.attendanceAudit.create({
                  data: {
                     attendanceCheckInId: record.id,
                     subEventId,
                     actorUserId: operatorUserId,
                     action: 'CHECK_IN',
                     revision: record.revision,
                  },
               });
               return { record, state: 'CHECKED_IN' as const, replay: false };
            } catch (error) {
               if (
                  error instanceof Prisma.PrismaClientKnownRequestError &&
                  error.code === 'P2002'
               ) {
                  const record = await tx.attendanceCheckIn.findFirstOrThrow({
                     where: { ticketId, voidedAt: null },
                  });
                  return {
                     record,
                     state: record.checkedOutAt
                        ? ('CHECKED_OUT' as const)
                        : ('CHECKED_IN' as const),
                     replay: true,
                  };
               }
               throw error;
            }
         },
         { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
   }

   async search(subEventId: string, query: SearchTicketQuery) {
      const where: Prisma.RegistrationTicketWhereInput = {
         subEventId,
         orderMember: {
            OR: [
               {
                  user: {
                     name: { contains: query.search, mode: 'insensitive' },
                  },
               },
               {
                  user: {
                     email: { contains: query.search, mode: 'insensitive' },
                  },
               },
               {
                  order: {
                     orderNumber: {
                        contains: query.search,
                        mode: 'insensitive',
                     },
                  },
               },
            ],
         },
      };
      const [rows, total] = await prisma.$transaction([
         prisma.registrationTicket.findMany({
            where,
            skip: (query.page - 1) * query.limit,
            take: query.limit,
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
            include: {
               ...eligibilityInclude,
               checkIns: {
                  where: { voidedAt: null },
                  take: 1,
                  orderBy: [{ checkedInAt: 'desc' }, { id: 'desc' }],
                  select: {
                     id: true,
                     checkedInAt: true,
                     checkedOutAt: true,
                     revision: true,
                  },
               },
            },
         }),
         prisma.registrationTicket.count({ where }),
      ]);
      return { rows, total };
   }

   async listAttendance(subEventId: string, query: AttendanceListQuery) {
      const where: Prisma.AttendanceCheckInWhereInput = {
         subEventId,
         ...(query.search && {
            ticket: {
               orderMember: {
                  user: {
                     OR: [
                        {
                           name: {
                              contains: query.search,
                              mode: 'insensitive',
                           },
                        },
                        {
                           email: {
                              contains: query.search,
                              mode: 'insensitive',
                           },
                        },
                     ],
                  },
               },
            },
         }),
      };
      const [data, totalRecords, currentlyCheckedIn, checkedOut, voided] =
         await prisma.$transaction([
            prisma.attendanceCheckIn.findMany({
               where,
               skip: (query.page - 1) * query.limit,
               take: query.limit,
               orderBy: [{ checkedInAt: 'desc' }, { id: 'desc' }],
               select: {
                  id: true,
                  checkedInAt: true,
                  checkedOutAt: true,
                  voidedAt: true,
                  voidReason: true,
                  correctionReason: true,
                  revision: true,
                  source: true,
                  ticket: {
                     select: {
                        id: true,
                        orderMember: {
                           select: {
                              user: { select: { name: true, email: true } },
                           },
                        },
                     },
                  },
                  audits: {
                     orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
                     select: {
                        id: true,
                        action: true,
                        reason: true,
                        revision: true,
                        createdAt: true,
                        actorUserId: true,
                     },
                  },
               },
            }),
            prisma.attendanceCheckIn.count({ where }),
            prisma.attendanceCheckIn.count({
               where: { subEventId, voidedAt: null, checkedOutAt: null },
            }),
            prisma.attendanceCheckIn.count({
               where: {
                  subEventId,
                  voidedAt: null,
                  checkedOutAt: { not: null },
               },
            }),
            prisma.attendanceCheckIn.count({
               where: { subEventId, voidedAt: { not: null } },
            }),
         ]);
      return { data, totalRecords, currentlyCheckedIn, checkedOut, voided };
   }

   mutateAttendance(
      subEventId: string,
      id: string,
      actorUserId: string,
      revision: number,
      reason: string,
      action: 'CHECK_OUT' | 'VOID',
   ) {
      return prisma.$transaction(
         async (tx) => {
            await tx.$queryRaw`SELECT "id" FROM "attendance_check_ins" WHERE "id" = ${id} AND "subEventId" = ${subEventId} FOR UPDATE`;
            const current = await tx.attendanceCheckIn.findFirst({
               where: { id, subEventId },
               include: {
                  subEvent: { select: { attendanceCheckoutEnabled: true } },
                  ticket: { select: { status: true } },
               },
            });
            if (!current) return null;
            if (current.revision !== revision || current.voidedAt)
               return { conflict: true } as const;
            if (action === 'CHECK_OUT' && current.checkedOutAt)
               return { record: current, replay: true } as const;
            if (
               action === 'CHECK_OUT' &&
               !current.subEvent.attendanceCheckoutEnabled
            )
               return { checkoutDisabled: true } as const;
            const now = new Date();
            const changed = await tx.attendanceCheckIn.updateMany({
               where: {
                  id,
                  subEventId,
                  revision,
                  voidedAt: null,
                  ...(action === 'CHECK_OUT' && { checkedOutAt: null }),
               },
               data: {
                  revision: { increment: 1 },
                  ...(action === 'CHECK_OUT'
                     ? { checkedOutAt: now, correctionReason: reason }
                     : {
                          voidedAt: now,
                          voidedBy: actorUserId,
                          voidReason: reason,
                       }),
               },
            });
            if (changed.count !== 1) return { conflict: true } as const;
            const record = await tx.attendanceCheckIn.findUniqueOrThrow({
               where: { id },
            });
            await tx.attendanceAudit.create({
               data: {
                  attendanceCheckInId: id,
                  subEventId,
                  actorUserId,
                  action,
                  reason,
                  revision: record.revision,
               },
            });
            if (action === 'VOID' && current.ticket.status === 'USED')
               await tx.registrationTicket.updateMany({
                  where: {
                     id: current.ticketId,
                     status: 'USED',
                     revokedAt: null,
                     OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
                  },
                  data: { status: 'ACTIVE' },
               });
            return { record, replay: false } as const;
         },
         { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
   }

   rotateLegacyCredential(
      ticketId: string,
      userId: string,
      credential: string,
      encrypted: {
         tokenCiphertext: string;
         tokenIv: string;
         tokenAuthTag: string;
         keyVersion: string;
      },
   ) {
      return prisma.$transaction(async (tx) => {
         await tx.$queryRaw`SELECT ticket."id" FROM "registration_tickets" ticket JOIN "registration_order_members" member ON member."id" = ticket."orderMemberId" WHERE ticket."id" = ${ticketId} AND member."userId" = ${userId} FOR UPDATE`;
         const ticket = await tx.registrationTicket.findFirst({
            where: {
               id: ticketId,
               orderMember: { userId },
               status: 'ACTIVE',
               checkIns: { none: {} },
            },
            select: {
               id: true,
               status: true,
               orderMember: { select: { registrationOrderId: true } },
            },
         });
         if (!ticket) return null;
         await tx.registrationTicket.update({
            where: { id: ticketId },
            data: { tokenHash: credential, ...encrypted },
         });
         await tx.registrationStatusHistory.create({
            data: {
               registrationOrderId: ticket.orderMember.registrationOrderId,
               entityType: 'TICKET',
               entityId: ticket.id,
               fromStatus: ticket.status,
               toStatus: ticket.status,
               actorUserId: userId,
               reason: 'LEGACY_CREDENTIAL_ROTATED',
            },
         });
         return true;
      });
   }
}
export const eventTicketRepository = new EventTicketRepository();
