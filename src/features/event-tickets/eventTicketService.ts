import QRCode from 'qrcode';
import { Prisma } from '@prisma/client';
import { prisma } from '@/config/prisma.js';
import { AppError } from '@/utils/appError.js';
import { eventCommitteeService } from '@/features/event-committee/eventCommitteeService.js';
import { eventTicketRepository } from './eventTicketRepository.js';
import {
   createOpaqueTicketCredential,
   decryptTicketCredential,
   encryptTicketCredential,
   hashTicketCredential,
} from './ticketCredentialCrypto.js';
import type {
   AttendanceListQuery,
   AttendanceMutationRequest,
   SearchTicketQuery,
} from './eventTicketTypes.js';

type SessionUser = { id: string; roles?: unknown };
type EligibleTicket = NonNullable<
   Awaited<ReturnType<typeof eventTicketRepository.findEligibleById>>
>;

type BlockingAssignment =
   EligibleTicket['orderMember']['postRegistrationAssignments'][number];
type ParticipantEligibilityInput = Pick<
   EligibleTicket,
   'status' | 'revokedAt' | 'expiresAt'
> & {
   orderMember: {
      status: EligibleTicket['orderMember']['status'];
      order: { status: EligibleTicket['orderMember']['order']['status'] };
      postRegistrationAssignments: BlockingAssignment[];
   };
};

const mapBlockingForm = (
   item: BlockingAssignment,
   orderApproved: boolean,
   now: Date,
) => {
   const completed = ['SUBMITTED', 'LOCKED'].includes(
      item.response?.status ?? '',
   );
   const correctionOpen =
      item.response?.status === 'NEEDS_CORRECTION' &&
      !!item.response.correctionDeadlineAt &&
      now < item.response.correctionDeadlineAt;
   const deadline =
      item.reopenDeadlineAt && now < item.reopenDeadlineAt
         ? item.reopenDeadlineAt
         : item.closesAt;
   const opened = !item.opensAt || item.opensAt <= now;
   const writable =
      orderApproved &&
      !completed &&
      (correctionOpen || (opened && (!deadline || now < deadline)));
   return {
      assignmentId: item.id,
      registrationId: item.registrationOrderId,
      formName: item.form.name,
      availability: correctionOpen
         ? ('CORRECTION' as const)
         : completed
           ? ('COMPLETED' as const)
           : !opened
             ? ('UPCOMING' as const)
             : deadline && now >= deadline
               ? ('OVERDUE' as const)
               : ('OPEN' as const),
      completion:
         item.response?.status === 'NEEDS_CORRECTION'
            ? ('NEEDS_CORRECTION' as const)
            : completed
              ? ('LOCKED' as const)
              : (item.response?._count.answers ?? 0) > 0
                ? ('DRAFT' as const)
                : ('NOT_STARTED' as const),
      canEdit: writable,
      canSubmit: writable,
   };
};

export const getParticipantCheckInEligibility = (
   ticket: ParticipantEligibilityInput,
   now = new Date(),
) => {
   const orderApproved = ticket.orderMember.order.status === 'APPROVED';
   const lifecyclePresentable =
      ticket.status === 'ACTIVE' &&
      !ticket.revokedAt &&
      (!ticket.expiresAt || ticket.expiresAt > now) &&
      orderApproved &&
      ticket.orderMember.status !== 'CANCELLED';
   const blockingForms = ticket.orderMember.postRegistrationAssignments
      .map((item) => mapBlockingForm(item, orderApproved, now))
      .filter(
         (item) =>
            item.availability !== 'UPCOMING' && item.completion !== 'LOCKED',
      );
   return {
      state: !lifecyclePresentable
         ? ('NOT_PRESENTABLE' as const)
         : blockingForms.length
           ? ('BLOCKED_BY_FORMS' as const)
           : ('READY' as const),
      canPresentQr: lifecyclePresentable && blockingForms.length === 0,
      blockingForms,
   };
};

const eligibility = (ticket: EligibleTicket, now = new Date()) => {
   const activeStatus = ticket.status === 'ACTIVE' || ticket.status === 'USED';
   const lifecycleEligible =
      activeStatus &&
      !ticket.revokedAt &&
      (!ticket.expiresAt || ticket.expiresAt > now) &&
      ticket.orderMember.order.status === 'APPROVED' &&
      ticket.orderMember.status !== 'CANCELLED';
   const blocked = ticket.orderMember.postRegistrationAssignments.some(
      (item) =>
         (!item.opensAt || item.opensAt <= now) &&
         !['SUBMITTED', 'LOCKED'].includes(item.response?.status ?? ''),
   );
   return {
      eligible: lifecycleEligible && !blocked,
      reason: !lifecycleEligible
         ? 'TICKET_INELIGIBLE'
         : blocked
           ? 'REQUIRED_ATTENDEE_FORM_INCOMPLETE'
           : null,
   };
};

const assertScope = async (subEventId: string, user: SessionUser) => {
   const scope = await eventTicketRepository.findSubEventScope(subEventId);
   if (!scope) throw new AppError('Sub-event not found', 404);
   await eventCommitteeService.assertEventCommitteeMemberOrAdmin(
      scope.eventId,
      user,
   );
};

export const issueTicketsForApprovedOrder = async (
   tx: Prisma.TransactionClient,
   orderId: string,
) => {
   const members = await tx.registrationOrderMember.findMany({
      where: {
         registrationOrderId: orderId,
         status: { not: 'CANCELLED' },
         order: { status: 'APPROVED' },
      },
      select: { id: true, subEventId: true },
   });
   for (const member of members) {
      const id = crypto.randomUUID();
      const credential = createOpaqueTicketCredential();
      try {
         await tx.registrationTicket.create({
            data: {
               id,
               orderMemberId: member.id,
               subEventId: member.subEventId,
               tokenHash: hashTicketCredential(credential),
               ...encryptTicketCredential(credential, id, member.id),
               status: 'ACTIVE',
               issuedAt: new Date(),
            },
         });
      } catch (error) {
         if (
            !(
               error instanceof Prisma.PrismaClientKnownRequestError &&
               error.code === 'P2002'
            )
         )
            throw error;
      }
   }
};

class EventTicketService {
   async listOwned(userId: string) {
      const missing = await prisma.registrationOrder.findMany({
         where: {
            status: 'APPROVED',
            members: {
               some: { userId, status: { not: 'CANCELLED' }, ticket: null },
            },
         },
         select: { id: true },
      });
      for (const order of missing)
         await prisma.$transaction((tx) =>
            issueTicketsForApprovedOrder(tx, order.id),
         );
      return (await eventTicketRepository.listOwned(userId)).map((ticket) =>
         this.mapParticipantTicket(ticket),
      );
   }
   async detail(id: string, userId: string) {
      const ticket = await eventTicketRepository.findOwned(id, userId);
      if (!ticket) throw new AppError('Ticket not found', 404);
      return this.mapParticipantTicket(ticket);
   }
   private mapParticipantTicket(
      ticket: ParticipantEligibilityInput & {
         id: string;
         issuedAt: Date | null;
         subEvent: { id: string; name: string; date: Date };
      },
   ) {
      const { orderMember, ...safeTicket } = ticket;
      delete (safeTicket as { revokedAt?: Date | null }).revokedAt;
      return {
         ...safeTicket,
         checkInEligibility: getParticipantCheckInEligibility({
            status: ticket.status,
            revokedAt: ticket.revokedAt,
            expiresAt: ticket.expiresAt,
            orderMember,
         }),
      };
   }
   async credential(id: string, userId: string) {
      const ticket = await eventTicketRepository.findOwned(id, userId, true);
      if (!ticket) throw new AppError('Ticket not found', 404);
      const eligibility = getParticipantCheckInEligibility({
         status: ticket.status,
         revokedAt: ticket.revokedAt,
         expiresAt: ticket.expiresAt,
         orderMember: ticket.orderMember,
      });
      if (!eligibility.canPresentQr)
         throw new AppError('Ticket is not available for presentation', 409);
      const recovered = decryptTicketCredential(ticket);
      if (recovered) return recovered;
      if (ticket.status !== 'ACTIVE')
         throw new AppError('Ticket credential is unavailable', 409);
      const credential = createOpaqueTicketCredential();
      const rotated = await eventTicketRepository.rotateLegacyCredential(
         id,
         userId,
         hashTicketCredential(credential),
         encryptTicketCredential(credential, id, ticket.orderMemberId),
      );
      if (!rotated) throw new AppError('Ticket credential is unavailable', 409);
      return credential;
   }
   async qr(id: string, userId: string) {
      return QRCode.toBuffer(await this.credential(id, userId), {
         type: 'png',
         errorCorrectionLevel: 'M',
         margin: 2,
         width: 512,
      });
   }
   async resolve(subEventId: string, credential: string, user: SessionUser) {
      await assertScope(subEventId, user);
      const ticket = await eventTicketRepository.findEligibleByHash(
         subEventId,
         hashTicketCredential(credential),
      );
      if (!ticket) throw new AppError('Ticket is not valid', 404);
      return this.mapResolved(ticket);
   }
   private mapResolved(ticket: EligibleTicket) {
      const state = eligibility(ticket);
      return {
         ticketId: ticket.id,
         status: ticket.status,
         eligibility: state,
         participant: ticket.orderMember.user,
         orderNumber: ticket.orderMember.order.orderNumber,
      };
   }
   async checkInCredential(
      subEventId: string,
      credential: string,
      user: SessionUser,
   ) {
      await assertScope(subEventId, user);
      const ticket = await eventTicketRepository.findEligibleByHash(
         subEventId,
         hashTicketCredential(credential),
      );
      if (!ticket) throw new AppError('Ticket is not valid', 404);
      return this.checkIn(ticket, subEventId, user.id, 'QR_SCAN');
   }
   async checkInManual(
      subEventId: string,
      ticketId: string,
      user: SessionUser,
   ) {
      await assertScope(subEventId, user);
      const ticket = await eventTicketRepository.findEligibleById(
         subEventId,
         ticketId,
      );
      if (!ticket) throw new AppError('Ticket not found', 404);
      return this.checkIn(ticket, subEventId, user.id, 'MANUAL');
   }
   private async checkIn(
      ticket: EligibleTicket,
      subEventId: string,
      userId: string,
      source: string,
   ) {
      const state = eligibility(ticket);
      if (!state.eligible)
         throw new AppError(
            state.reason === 'REQUIRED_ATTENDEE_FORM_INCOMPLETE'
               ? 'Required participant information is incomplete'
               : 'Ticket is not eligible for check-in',
            409,
         );
      const result = await eventTicketRepository.checkIn(
         ticket.id,
         subEventId,
         userId,
         source,
      );
      return {
         ...result,
         participant: ticket.orderMember.user,
         orderNumber: ticket.orderMember.order.orderNumber,
      };
   }
   async search(
      subEventId: string,
      query: SearchTicketQuery,
      user: SessionUser,
   ) {
      await assertScope(subEventId, user);
      const result = await eventTicketRepository.search(subEventId, query);
      return {
         data: result.rows.map((ticket) => ({
            ...this.mapResolved(ticket),
            attendance: ticket.checkIns[0]
               ? {
                    ...ticket.checkIns[0],
                    state: ticket.checkIns[0].checkedOutAt
                       ? 'CHECKED_OUT'
                       : 'CHECKED_IN',
                 }
               : null,
         })),
         meta: {
            page: query.page,
            limit: query.limit,
            totalRecords: result.total,
            totalPages: Math.ceil(result.total / query.limit),
         },
      };
   }
   async attendance(
      subEventId: string,
      query: AttendanceListQuery,
      user: SessionUser,
   ) {
      await assertScope(subEventId, user);
      const result = await eventTicketRepository.listAttendance(
         subEventId,
         query,
      );
      return {
         data: result.data,
         counts: {
            currentlyCheckedIn: result.currentlyCheckedIn,
            checkedOut: result.checkedOut,
            voided: result.voided,
            totalRecords: result.totalRecords,
         },
         meta: {
            page: query.page,
            limit: query.limit,
            totalRecords: result.totalRecords,
            totalPages: Math.ceil(result.totalRecords / query.limit),
         },
      };
   }
   async mutate(
      subEventId: string,
      id: string,
      user: SessionUser,
      payload: AttendanceMutationRequest,
      action: 'CHECK_OUT' | 'VOID',
   ) {
      await assertScope(subEventId, user);
      const result = await eventTicketRepository.mutateAttendance(
         subEventId,
         id,
         user.id,
         payload.revision,
         payload.reason,
         action,
      );
      if (!result) throw new AppError('Attendance record not found', 404);
      if ('conflict' in result)
         throw new AppError('Attendance record has changed', 409);
      if ('checkoutDisabled' in result)
         throw new AppError('Checkout is not enabled for this sub-event', 409);
      return result;
   }
}
export const eventTicketService = new EventTicketService();
