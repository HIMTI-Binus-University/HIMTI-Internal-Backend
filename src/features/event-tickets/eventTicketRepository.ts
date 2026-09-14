import { Prisma } from '@prisma/client';
import { prisma } from '@/config/prisma.js';
import type { z } from 'zod';
import type { TicketSearchSchema } from './eventTicketSchema.js';
import { createTicketCredential } from './eventTicketTypes.js';

type Search = z.infer<typeof TicketSearchSchema>;
const participantSelect = {
   id: true,
   eventId: true,
   status: true,
   issuedAt: true,
   expiresAt: true,
   credentialEncrypted: true,
   event: {
      select: {
         name: true,
         startsAt: true,
         endsAt: true,
         attendanceEnabled: true,
         attendanceCheckoutEnabled: true,
      },
   },
   checkIns: {
      where: { voidedAt: null },
      select: {
         id: true,
         checkedInAt: true,
         checkedOutAt: true,
         revision: true,
      },
      take: 1,
   },
} satisfies Prisma.RegistrationTicketSelect;

class EventTicketRepository {
   listOwned(userId: string) {
      return prisma.registrationTicket.findMany({
         where: {
            status: 'ACTIVE',
            OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
            orderMember: {
               userId,
               status: 'LOCKED',
               order: { status: 'CONFIRMED' },
            },
         },
         select: participantSelect,
         orderBy: { issuedAt: 'desc' },
      });
   }
   owned(id: string, userId: string) {
      return prisma.registrationTicket.findFirst({
         where: {
            id,
            status: 'ACTIVE',
            OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
            orderMember: {
               userId,
               status: 'LOCKED',
               order: { status: 'CONFIRMED' },
            },
         },
         select: participantSelect,
      });
   }
   recover(id: string, userId: string) {
      return prisma.$transaction(async (tx) => {
         await tx.$queryRaw`SELECT id FROM registration_tickets WHERE id = ${id} FOR UPDATE`;
         const ticket = await tx.registrationTicket.findFirst({
            where: {
               id,
               status: 'ACTIVE',
               OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
               orderMember: {
                  userId,
                  status: 'LOCKED',
                  order: { status: 'CONFIRMED' },
               },
            },
            select: { credentialEncrypted: true },
         });
         if (!ticket) return null;
         if (ticket.credentialEncrypted) return ticket.credentialEncrypted;
         const generated = createTicketCredential();
         await tx.registrationTicket.update({
            where: { id },
            data: {
               tokenHash: generated.tokenHash,
               credentialEncrypted: generated.credentialEncrypted,
            },
         });
         return generated.credentialEncrypted;
      });
   }
   search(eventId: string, query: Search) {
      const attendance =
         query.state === 'NOT_CHECKED_IN'
            ? { none: { voidedAt: null } }
            : query.state === 'CHECKED_IN'
              ? { some: { voidedAt: null, checkedOutAt: null } }
              : query.state === 'CHECKED_OUT'
                ? { some: { voidedAt: null, checkedOutAt: { not: null } } }
                : undefined;
      const where: Prisma.RegistrationTicketWhereInput = {
         eventId,
         status: 'ACTIVE',
         orderMember: {
            status: 'LOCKED',
            order: { status: 'CONFIRMED' },
            ...(query.search && {
               OR: [
                  {
                     snapshotName: {
                        contains: query.search,
                        mode: 'insensitive',
                     },
                  },
                  {
                     snapshotEmail: {
                        contains: query.search,
                        mode: 'insensitive',
                     },
                  },
                  {
                     snapshotNim: {
                        contains: query.search,
                        mode: 'insensitive',
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
            }),
         },
         ...(attendance && { checkIns: attendance }),
      };
      return prisma.$transaction([
         prisma.registrationTicket.findMany({
            where,
            select: {
               id: true,
               status: true,
               issuedAt: true,
               orderMember: {
                  select: {
                     snapshotName: true,
                     snapshotEmail: true,
                     snapshotNim: true,
                     order: { select: { orderNumber: true } },
                  },
               },
               checkIns: {
                  where: { voidedAt: null },
                  select: {
                     id: true,
                     checkedInAt: true,
                     checkedOutAt: true,
                     revision: true,
                  },
                  take: 1,
               },
            },
            orderBy: { orderMember: { snapshotName: 'asc' } },
            skip: (query.page - 1) * query.limit,
            take: query.limit,
         }),
         prisma.registrationTicket.count({ where }),
      ]);
   }
   async checkIn(
      eventId: string,
      ticketId: string | null,
      tokenHash: string | null,
      actorId: string,
   ) {
      return prisma.$transaction(
         async (tx) => {
            await tx.$queryRaw`SELECT id FROM events WHERE id = ${eventId} FOR UPDATE`;
            const event = await tx.event.findUnique({
               where: { id: eventId },
               select: { attendanceEnabled: true },
            });
            if (!event?.attendanceEnabled)
               return { result: 'DISABLED' as const };
            const ticket = await tx.registrationTicket.findFirst({
               where: {
                  eventId,
                  ...(ticketId ? { id: ticketId } : { tokenHash: tokenHash! }),
               },
               select: { id: true },
            });
            if (!ticket) return { result: 'INVALID' as const };
            await tx.$queryRaw`SELECT id FROM registration_tickets WHERE id = ${ticket.id} FOR UPDATE`;
            const valid = await tx.registrationTicket.findFirst({
               where: {
                  id: ticket.id,
                  eventId,
                  status: 'ACTIVE',
                  OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
                  orderMember: {
                     status: 'LOCKED',
                     order: { status: 'CONFIRMED', eventId },
                  },
               },
               select: { id: true },
            });
            if (!valid) return { result: 'INVALID' as const };
            const existing = await tx.attendanceCheckIn.findFirst({
               where: { ticketId: ticket.id, voidedAt: null },
            });
            if (existing)
               return { result: 'DUPLICATE' as const, attendance: existing };
            const attendance = await tx.attendanceCheckIn.create({
               data: {
                  eventId,
                  ticketId: ticket.id,
                  operatorUserId: actorId,
                  audits: {
                     create: { actorUserId: actorId, action: 'CHECK_IN' },
                  },
               },
            });
            return { result: 'CHECKED_IN' as const, attendance };
         },
         { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
   }
   checkout(eventId: string, id: string, revision: number, actorId: string) {
      return prisma.$transaction(
         async (tx) => {
            await tx.$queryRaw`SELECT id FROM events WHERE id = ${eventId} FOR UPDATE`;
            const event = await tx.event.findUnique({
               where: { id: eventId },
               select: {
                  attendanceEnabled: true,
                  attendanceCheckoutEnabled: true,
               },
            });
            if (!event?.attendanceEnabled)
               return { result: 'DISABLED' as const };
            if (!event.attendanceCheckoutEnabled)
               return { result: 'CHECKOUT_DISABLED' as const };
            await tx.$queryRaw`SELECT id FROM attendance_check_ins WHERE id = ${id} FOR UPDATE`;
            const attendance = await tx.attendanceCheckIn.findFirst({
               where: { id, eventId, voidedAt: null },
            });
            if (!attendance) return { result: 'NOT_FOUND' as const };
            if (attendance.checkedOutAt)
               return { result: 'DUPLICATE' as const, attendance };
            if (attendance.revision !== revision)
               return { result: 'CONFLICT' as const };
            const updated = await tx.attendanceCheckIn.update({
               where: { id },
               data: {
                  checkedOutAt: new Date(),
                  revision: { increment: 1 },
                  audits: {
                     create: { actorUserId: actorId, action: 'CHECK_OUT' },
                  },
               },
            });
            return { result: 'CHECKED_OUT' as const, attendance: updated };
         },
         { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
   }
   void(
      eventId: string,
      id: string,
      revision: number,
      reason: string,
      actorId: string,
   ) {
      return prisma.$transaction(
         async (tx) => {
            await tx.$queryRaw`SELECT id FROM events WHERE id = ${eventId} FOR UPDATE`;
            const event = await tx.event.findUnique({
               where: { id: eventId },
               select: { attendanceEnabled: true },
            });
            if (!event?.attendanceEnabled)
               return { result: 'DISABLED' as const };
            await tx.$queryRaw`SELECT id FROM attendance_check_ins WHERE id = ${id} FOR UPDATE`;
            const attendance = await tx.attendanceCheckIn.findFirst({
               where: { id, eventId },
            });
            if (!attendance) return { result: 'NOT_FOUND' as const };
            if (attendance.voidedAt)
               return { result: 'DUPLICATE' as const, attendance };
            if (attendance.revision !== revision)
               return { result: 'CONFLICT' as const };
            const updated = await tx.attendanceCheckIn.update({
               where: { id },
               data: {
                  voidedAt: new Date(),
                  revision: { increment: 1 },
                  audits: {
                     create: {
                        actorUserId: actorId,
                        action: 'VOID',
                        reason,
                     },
                  },
               },
            });
            return { result: 'VOIDED' as const, attendance: updated };
         },
         { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
   }
}
export const eventTicketRepository = new EventTicketRepository();
