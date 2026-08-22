import { createHash } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { AppError } from '@/utils/appError.js';
import { eventCommitteeService } from '@/features/event-committee/eventCommitteeService.js';
import { eventRegistrationRepository } from './eventRegistrationRepository.js';
import type {
   CreateRegistrationRequest,
   RegistrationPagination,
   ReplaceResponsesRequest,
   SessionUser,
   InternalRegistrationListQuery,
   RegistrationDecisionRequest,
   BulkRegistrationDecisionRequest,
} from './eventRegistrationTypes.js';
import {
   capacityConsumingStatuses,
   ResponseAccessDenied,
   ResponseCorrectionDeadlinePassed,
   ResponseRevisionConflict,
   ResponseValidationFailure,
   validateFreshSubmission,
} from './eventRegistrationTypes.js';

const unsupported = (code: string, message: string) =>
   new AppError(message, 422, code);

const toIso = (value: Date | null | undefined) =>
   value ? value.toISOString() : null;

const mapPackage = (value: {
   id: string;
   code: string;
   name: string;
   seatCount: number;
   currency: string;
   priceMinor: bigint;
   revision?: number;
}) => ({
   id: value.id,
   code: value.code,
   name: value.name,
   seatCount: value.seatCount,
   currency: value.currency,
   priceMinor: value.priceMinor.toString(),
   ...(value.revision !== undefined && { revision: value.revision }),
});

type Assignment = Awaited<
   ReturnType<typeof eventRegistrationRepository.getAssignedForms>
>[number];

const mapForms = (assignments: Assignment[]) => {
   const unique = new Map<string, Assignment>();
   for (const assignment of assignments) {
      unique.set(
         `${assignment.registrationFormId}:${assignment.audience}`,
         assignment,
      );
   }
   return [...unique.values()].map((assignment) => ({
      id: assignment.form.id,
      name: assignment.form.name,
      description: assignment.form.description,
      audience: assignment.audience,
      isRequired: assignment.isRequired,
      orderIndex: assignment.orderIndex,
      questions: assignment.form.questions.map((question) => ({
         id: question.id,
         label: question.label,
         fieldKey: question.fieldKey,
         fieldType: question.fieldType,
         isRequired: question.isRequired,
         helpText: question.helpText,
         validation: question.validation,
         orderIndex: question.orderIndex,
         options: question.options.map((option) => ({
            id: option.id,
            label: option.label,
            value: option.value,
         })),
      })),
   }));
};

type DetailOrder = NonNullable<
   Awaited<ReturnType<typeof eventRegistrationRepository.findOwned>>
>;

const mapSubmissionForms = (submissions: DetailOrder['submissions']) =>
   submissions
      .map((submission) => ({
         id: submission.form.id,
         name: submission.form.name,
         description: submission.form.description,
         audience: submission.assignmentAudience,
         isRequired: submission.assignmentRequired,
         orderIndex: submission.assignmentOrderIndex,
         questions: submission.form.questions.map((question) => ({
            id: question.id,
            label: question.label,
            fieldKey: question.fieldKey,
            fieldType: question.fieldType,
            isRequired: question.isRequired,
            helpText: question.helpText,
            validation: question.validation,
            orderIndex: question.orderIndex,
            options: question.options.map((option) => ({
               id: option.id,
               label: option.label,
               value: option.value,
            })),
         })),
      }))
      .sort(
         (left, right) =>
            left.orderIndex - right.orderIndex ||
            left.id.localeCompare(right.id),
      );

const mapAnswer = (
   answer: DetailOrder['submissions'][number]['answers'][number],
) => {
   const type = answer.question.fieldType;
   if (type === 'FILE') {
      return {
         questionId: answer.formQuestionId,
         type,
         value: null,
         fileAvailable: Boolean(answer.fileUrl),
      };
   }
   if (type === 'NUMBER') {
      return {
         questionId: answer.formQuestionId,
         type,
         value: answer.numberValue?.toString() ?? '',
      };
   }
   if (type === 'DATE') {
      return {
         questionId: answer.formQuestionId,
         type,
         value: answer.dateValue?.toISOString().slice(0, 10) ?? '',
      };
   }
   if (type === 'CHECKBOX') {
      return {
         questionId: answer.formQuestionId,
         type,
         value: answer.selectedOptions.map((selected) => selected.optionId),
      };
   }
   if (type === 'SELECT' || type === 'RADIO') {
      return {
         questionId: answer.formQuestionId,
         type,
         value: answer.selectedOptions[0]?.optionId ?? '',
      };
   }
   return {
      questionId: answer.formQuestionId,
      type,
      value: answer.textValue ?? '',
   };
};

type SummaryOrder = Pick<
   DetailOrder,
   | 'id'
   | 'orderNumber'
   | 'status'
   | 'event'
   | 'subEvent'
   | 'ticketPackage'
   | 'createdAt'
   | 'submittedAt'
   | 'cancelledAt'
>;

const mapSummary = (order: SummaryOrder) => ({
   id: order.id,
   orderNumber: order.orderNumber,
   status: order.status,
   event: order.event,
   subEvent: {
      ...order.subEvent,
      date: order.subEvent.date.toISOString(),
   },
   package: mapPackage(order.ticketPackage),
   createdAt: order.createdAt.toISOString(),
   submittedAt: toIso(order.submittedAt),
   cancelledAt: toIso(order.cancelledAt),
});

const mapInternalSummary = (
   order: Awaited<
      ReturnType<typeof eventRegistrationRepository.listInternal>
   >['data'][number],
) => {
   const responseStatuses = [
      ...new Set(order.submissions.map((item) => item.status)),
   ];
   const responseStatus =
      responseStatuses.find((status) => status === 'NEEDS_CORRECTION') ??
      responseStatuses.find((status) => status === 'DRAFT') ??
      responseStatuses.find((status) => status === 'SUBMITTED') ??
      responseStatuses.find((status) => status === 'LOCKED') ??
      responseStatuses.find((status) => status === 'SUPERSEDED') ??
      null;
   const requiredSubmissions = order.submissions.filter(
      (submission) => submission.assignmentRequired,
   );
   const completedResponseCount = requiredSubmissions.filter(
      (submission) =>
         validateFreshSubmission(
            submission.form.questions,
            submission.answers,
            true,
         ).length === 0,
   ).length;
   const claimedSeatCount = order.members.filter(
      (member) => member.status !== 'CANCELLED',
   ).length;
   const readinessBlockerCodes = [
      ...(claimedSeatCount !== order.seatCount ? ['SEATS_UNCLAIMED'] : []),
      ...(completedResponseCount !== requiredSubmissions.length
         ? ['REQUIRED_RESPONSES_INCOMPLETE']
         : []),
      ...(order.invitations.some(
         (invitation) => invitation.status === 'PENDING',
      )
         ? ['INVITATIONS_PENDING']
         : []),
      ...(![
         'DRAFT',
         'AWAITING_MEMBERS',
         'HOLDING',
         'NEEDS_CORRECTION',
      ].includes(order.status)
         ? ['ORDER_NOT_SUBMITTABLE']
         : []),
   ];
   return {
      id: order.id,
      orderNumber: order.orderNumber,
      revision: order.revision,
      status: order.status,
      responseStatus,
      responseStatuses,
      paymentStatus:
         order.totalMinor === 0n && !order.payment
            ? ('NOT_REQUIRED' as const)
            : (order.payment?.status ?? null),
      seatCount: order.seatCount,
      package: mapPackage(order.ticketPackage),
      rosterSummary: {
         activeMemberCount: order.members.filter(
            (member) => member.status !== 'CANCELLED',
         ).length,
         pendingSlotCount: Math.max(
            0,
            order.seatCount -
               order.members.filter((member) => member.status !== 'CANCELLED')
                  .length,
         ),
         pendingInvitationCount: order.invitations.filter(
            (invitation) => invitation.status === 'PENDING',
         ).length,
      },
      readiness: {
         claimedSeatCount,
         requiredResponseCount: requiredSubmissions.length,
         completedResponseCount,
         responsesComplete:
            completedResponseCount === requiredSubmissions.length,
         submittable: readinessBlockerCodes.length === 0,
         blockerCodes: readinessBlockerCodes,
      },
      participant: order.buyer,
      subEvent: { ...order.subEvent, date: order.subEvent.date.toISOString() },
      createdAt: order.createdAt.toISOString(),
      submittedAt: toIso(order.submittedAt),
   };
};

const detailReadiness = (order: DetailOrder) => {
   const activeMembers = order.members.filter(
      (member) => member.status !== 'CANCELLED',
   );
   const requiredSubmissions = order.submissions.filter(
      (submission) => submission.assignmentRequired,
   );
   const completedResponseCount = requiredSubmissions.filter(
      (submission) =>
         validateFreshSubmission(
            submission.form.questions,
            submission.answers,
            true,
         ).length === 0,
   ).length;
   const blockerCodes = [
      ...(activeMembers.length !== order.seatCount ? ['SEATS_UNCLAIMED'] : []),
      ...(completedResponseCount !== requiredSubmissions.length
         ? ['REQUIRED_RESPONSES_INCOMPLETE']
         : []),
      ...(order.invitations.some(
         (invitation) => invitation.status === 'PENDING',
      )
         ? ['INVITATIONS_PENDING']
         : []),
      ...(![
         'DRAFT',
         'AWAITING_MEMBERS',
         'HOLDING',
         'NEEDS_CORRECTION',
      ].includes(order.status)
         ? ['ORDER_NOT_SUBMITTABLE']
         : []),
   ];
   return {
      seatCount: order.seatCount,
      claimedSeatCount: activeMembers.length,
      activeMemberCount: activeMembers.length,
      pendingSlotCount: Math.max(0, order.seatCount - activeMembers.length),
      readyMemberCount: activeMembers.filter((item) => item.status === 'READY')
         .length,
      requiredResponseCount: requiredSubmissions.length,
      completedResponseCount,
      responsesComplete:
         completedResponseCount === requiredSubmissions.length,
      submittable: blockerCodes.length === 0,
      blockerCodes,
      complete: activeMembers.length === order.seatCount,
   };
};

const mapDetail = async (order: DetailOrder, viewerUserId?: string) => {
   const ownMemberIds = new Set(
      order.members
         .filter((member) => member.userId === viewerUserId)
         .map((member) => member.id),
   );
   const isBuyer = !viewerUserId || order.buyerUserId === viewerUserId;
   const activeMembers = order.members.filter(
      (member) => member.status !== 'CANCELLED',
   );
   const invitationByPosition = new Map(
      order.invitations.map((invitation) => [
         invitation.slotPosition,
         invitation,
      ]),
   );
   const visibleSubmissions = viewerUserId
      ? order.submissions.filter(
           (submission) =>
              (isBuyer && submission.orderMemberId === null) ||
              (submission.orderMemberId !== null &&
                 ownMemberIds.has(submission.orderMemberId)),
        )
      : order.submissions;
   return {
      ...mapSummary(order),
      correctionReason:
         order.status === 'NEEDS_CORRECTION'
            ? (order.history[0]?.reason ?? null)
            : null,
      correctionDeadlineAt:
         order.status === 'NEEDS_CORRECTION'
            ? toIso(order.correctionDeadlineAt)
            : null,
      forms: mapSubmissionForms(visibleSubmissions),
      submissions: visibleSubmissions.map((submission) => ({
         id: submission.id,
         formId: submission.registrationFormId,
         status: submission.status,
         revision: submission.revision,
         audience: submission.assignmentAudience,
         orderMemberId: submission.orderMemberId,
         answers: submission.answers.map(mapAnswer),
      })),
      viewer: {
         role: isBuyer ? ('BUYER' as const) : ('MEMBER' as const),
         capabilities: isBuyer
            ? [
                 'SAVE_BUYER',
                 'SAVE_OWN_MEMBER',
                 'MANAGE_INVITATIONS',
                 'SUBMIT',
                 'CANCEL',
              ]
            : ['SAVE_OWN_MEMBER'],
      },
      memberDeadlineAt: toIso(order.memberDeadlineAt),
      roster: Array.from({ length: order.seatCount }, (_, position) => {
         const member = activeMembers.find(
            (item) => item.position === position,
         );
         const invitation = invitationByPosition.get(position);
         const isSelf = member?.userId === viewerUserId;
         return {
            position,
            status: member?.status ?? invitation?.status ?? 'UNCLAIMED',
            isBuyer: position === 0,
            isSelf,
            name: member && (isBuyer || isSelf) ? member.user.name : null,
            email:
               member && (isBuyer || isSelf)
                  ? member.user.email
                  : isBuyer && invitation
                    ? invitation.email
                    : null,
            invitationId: isBuyer ? (invitation?.id ?? null) : null,
         };
      }),
      readiness: detailReadiness(order),
   };
};

const translateConcurrencyError = (error: unknown): never => {
   if (error instanceof ResponseRevisionConflict) {
      throw new AppError(
         'A response was changed by another request',
         409,
         'REVISION_CONFLICT',
      );
   }
   if (error instanceof ResponseAccessDenied) {
      throw new AppError(
         'Registration not found',
         404,
         'REGISTRATION_NOT_FOUND',
      );
   }
   if (error instanceof ResponseValidationFailure) {
      throw new AppError('Invalid form answers', 400, 'FORM_ANSWER_INVALID', {
         fieldErrors: error.fieldErrors,
      });
   }
   if (error instanceof ResponseCorrectionDeadlinePassed) {
      throw new AppError(
         'The correction deadline has passed',
         409,
         'CORRECTION_DEADLINE_PASSED',
      );
   }
   if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === 'P2002' || error.code === 'P2034')
   ) {
      throw new AppError(
         'The registration changed concurrently. Please retry.',
         409,
         'REGISTRATION_CONFLICT',
      );
   }
   throw error;
};

class EventRegistrationService {
   private async assertInternalAccess(eventId: string, user: SessionUser) {
      await eventCommitteeService.assertEventCommitteeMemberOrAdmin(
         eventId,
         user,
      );
   }

   private async getAuthorizedSubEvent(subEventId: string, user: SessionUser) {
      const scope =
         await eventRegistrationRepository.getSubEventScope(subEventId);
      if (!scope)
         throw new AppError('Sub-event not found', 404, 'SUB_EVENT_NOT_FOUND');
      await this.assertInternalAccess(scope.eventId, user);
      return scope;
   }

   private async getAuthorizedRegistration(
      registrationId: string,
      user: SessionUser,
   ) {
      const scope =
         await eventRegistrationRepository.getRegistrationScope(registrationId);
      if (!scope)
         throw new AppError(
            'Registration not found',
            404,
            'REGISTRATION_NOT_FOUND',
         );
      await this.assertInternalAccess(scope.eventId, user);
      return scope;
   }

   async listInternal(
      subEventId: string,
      user: SessionUser,
      params: InternalRegistrationListQuery,
   ) {
      await this.getAuthorizedSubEvent(subEventId, user);
      const { data, total } = await eventRegistrationRepository.listInternal(
         subEventId,
         params,
      );
      return {
         data: data.map(mapInternalSummary),
         meta: {
            page: params.page,
            limit: params.limit,
            totalRecords: total,
            totalPages: Math.ceil(total / params.limit),
         },
      };
   }

   async getCapacity(subEventId: string, user: SessionUser) {
      await this.getAuthorizedSubEvent(subEventId, user);
      const row = await eventRegistrationRepository.capacitySummary(subEventId);
      if (!row)
         throw new AppError('Sub-event not found', 404, 'SUB_EVENT_NOT_FOUND');
      const { registrationOrders, capacityHolds, ...subEvent } = row;
      const byStatus = Object.fromEntries(
         capacityConsumingStatuses.map((status) => [
            status,
            registrationOrders
               .filter((order) => order.status === status)
               .reduce((sum, order) => sum + order.seatCount, 0),
         ]),
      );
      const occupied = Object.values(byStatus).reduce(
         (sum, count) => sum + count,
         0,
      );
      const liveHeldSeats = capacityHolds.reduce(
         (sum, hold) => sum + hold.quantity,
         0,
      );
      const reserved = occupied + liveHeldSeats;
      return {
         ...subEvent,
         occupied,
         liveHeldSeats,
         reserved,
         remaining:
            subEvent.maxParticipants === null
               ? null
               : Math.max(0, subEvent.maxParticipants - reserved),
         byStatus,
      };
   }

   async getInternal(registrationId: string, user: SessionUser) {
      await this.getAuthorizedRegistration(registrationId, user);
      const order =
         await eventRegistrationRepository.findInternal(registrationId);
      if (!order)
         throw new AppError(
            'Registration not found',
            404,
            'REGISTRATION_NOT_FOUND',
         );
      const canViewAnswers = await eventRegistrationRepository.hasPermission(
         user.id,
         'view_event_answers',
      );
      const sections = new Map<
         string,
         { id: string; title: string; orderIndex: number; answers: unknown[] }
      >();
      if (canViewAnswers) {
         for (const submission of order.submissions) {
            for (const answer of submission.answers) {
               const section = submission.form.sections.find(
                  (item) => item.id === answer.question.sectionId,
               );
               const key = section?.id ?? `unsectioned-${submission.id}`;
               if (!sections.has(key))
                  sections.set(key, {
                     id: key,
                     title: section?.title ?? submission.form.name,
                     orderIndex: section?.orderIndex ?? 0,
                     answers: [],
                  });
               sections.get(key)!.answers.push({
                  question: {
                     id: answer.question.id,
                     label: answer.question.label,
                     fieldType: answer.question.fieldType,
                  },
                  answer: mapAnswer(answer),
               });
            }
         }
      }
      return {
         ...mapInternalSummary({
            ...order,
            submissions: order.submissions,
         }),
         answersVisible: canViewAnswers,
         sections: [...sections.values()].sort(
            (left, right) => left.orderIndex - right.orderIndex,
         ),
         history: order.history.map((item) => ({
            ...item,
            createdAt: item.createdAt.toISOString(),
         })),
      };
   }

   async getQueueNeighbors(
      subEventId: string,
      registrationId: string,
      user: SessionUser,
      params: Omit<InternalRegistrationListQuery, 'page' | 'limit'>,
   ) {
      await this.getAuthorizedSubEvent(subEventId, user);
      const result = await eventRegistrationRepository.queueNeighbors(
         subEventId,
         registrationId,
         params,
      );
      if (!result)
         throw new AppError(
            'Registration not found',
            404,
            'REGISTRATION_NOT_FOUND',
         );
      return result;
   }

   async review(
      registrationId: string,
      user: SessionUser,
      action: 'APPROVED' | 'REJECTED' | 'NEEDS_CORRECTION' | 'CANCELLED',
      payload: RegistrationDecisionRequest,
   ) {
      const scope = await this.getAuthorizedRegistration(registrationId, user);
      const result = await eventRegistrationRepository
         .reviewMany(scope, user.id, action, {
            items: [{ registrationId, revision: payload.revision }],
            reason: payload.reason,
         })
         .catch(translateConcurrencyError);
      if ('notFound' in result)
         throw new AppError(
            'Registration not found',
            404,
            'REGISTRATION_NOT_FOUND',
         );
      if ('conflict' in result)
         throw new AppError(
            'Registration revision or lifecycle changed',
            409,
            'REGISTRATION_CONFLICT',
         );
      return result[0];
   }

   async bulkReview(
      subEventId: string,
      user: SessionUser,
      action: 'APPROVED' | 'REJECTED' | 'CANCELLED',
      payload: BulkRegistrationDecisionRequest,
   ) {
      const scope = await this.getAuthorizedSubEvent(subEventId, user);
      const result = await eventRegistrationRepository
         .reviewMany(
            { eventId: scope.eventId, subEventId: scope.id },
            user.id,
            action,
            payload,
         )
         .catch(translateConcurrencyError);
      if ('notFound' in result)
         throw new AppError(
            'One or more registrations were not found',
            404,
            'REGISTRATION_NOT_FOUND',
         );
      if ('conflict' in result)
         throw new AppError(
            'The bulk operation has a revision or lifecycle conflict',
            409,
            'REGISTRATION_CONFLICT',
         );
      return result;
   }
   async listPublicEvents(params: RegistrationPagination) {
      const { data, total } =
         await eventRegistrationRepository.listPublicEvents(params);
      return {
         data: data.map(({ subevents, ...event }) => ({
            ...event,
            subEvents: subevents.map((subEvent) => ({
               ...subEvent,
               date: subEvent.date.toISOString(),
            })),
         })),
         meta: {
            page: params.page,
            limit: params.limit,
            totalRecords: total,
            totalPages: Math.ceil(total / params.limit),
         },
      };
   }

   async getPublicEvent(eventId: string) {
      const event = await eventRegistrationRepository.getPublicEvent(eventId);
      if (!event) throw new AppError('Event not found', 404, 'EVENT_NOT_FOUND');
      const { subevents, ...base } = event;
      return {
         ...base,
         subEvents: subevents.map((subEvent) => ({
            ...subEvent,
            date: subEvent.date.toISOString(),
         })),
      };
   }

   async getContext(
      subEventId: string,
      user?: SessionUser,
      inviteToken?: string,
   ) {
      const source = await eventRegistrationRepository.getContextSource(
         subEventId,
         user?.id,
      );
      const now = new Date();
      const eligiblePackages =
         source?.ticketPackages.filter(
            (item) =>
               item.status === 'ACTIVE' &&
               (!item.salesStartAt || item.salesStartAt <= now) &&
               (!item.salesEndAt || item.salesEndAt > now),
         ) ?? [];
      const packages = eligiblePackages.map(mapPackage);
      if (!source || source.event.status !== 'PUBLISHED') {
         throw new AppError('Sub-event not found', 404, 'SUB_EVENT_NOT_FOUND');
      }
      if (source.registrationMode === 'DISABLED') {
         return {
            action: 'UNAVAILABLE' as const,
            code: 'REGISTRATION_DISABLED',
            destinationUrl: null,
            package: null,
            packages,
            registrationId: null,
            forms: [],
         };
      }
      if (!user) {
         return {
            action: 'SIGN_IN' as const,
            code: 'SIGN_IN_REQUIRED',
            destinationUrl: null,
            package: null,
            packages,
            registrationId: null,
            forms: [],
         };
      }
      const identity = await eventRegistrationRepository.getUserEligibility(
         user.id,
      );
      if (!identity || identity.status !== 'ACTIVE')
         throw new AppError('Account is not active', 403, 'ACCOUNT_INACTIVE');
      if (source.visibility === 'PUBLIC') {
         if (
            !identity.emailVerified ||
            !identity.accounts.some(
               (account) => account.providerId === 'google',
            )
         ) {
            throw new AppError(
               'An active verified Google account is required',
               403,
               'GOOGLE_ACCOUNT_REQUIRED',
            );
         }
      } else if (source.visibility === 'INTERNAL') {
         if (
            !identity.registrationCompletedAt ||
            identity.membershipPeriods.length === 0
         ) {
            throw new AppError(
               'Current membership is required',
               403,
               'CURRENT_MEMBERSHIP_REQUIRED',
            );
         }
      } else {
         if (!inviteToken)
            throw new AppError(
               'A valid invitation is required',
               403,
               'INVITATION_REQUIRED',
            );
         const invitation = await eventRegistrationRepository.findInvitation(
            subEventId,
            createHash('sha256').update(inviteToken).digest('hex'),
            user.id,
         );
         if (
            !invitation ||
            !identity.emailVerified ||
            invitation.email.toLowerCase() !== identity.email.toLowerCase()
         ) {
            throw new AppError(
               'Invitation is invalid',
               403,
               'INVITATION_INVALID',
            );
         }
      }
      if (source.registrationMode === 'EXTERNAL') {
         return {
            action: 'EXTERNAL' as const,
            code: 'EXTERNAL_REGISTRATION',
            destinationUrl: source.destinationUrl,
            package: null,
            packages,
            registrationId: null,
            forms: [],
         };
      }
      const registration = source.registrationOrders[0];
      if (
         registration &&
         ['DRAFT', 'AWAITING_MEMBERS', 'HOLDING', 'NEEDS_CORRECTION'].includes(
            registration.status,
         ) &&
         (registration.status !== 'NEEDS_CORRECTION' ||
            !registration.correctionDeadlineAt ||
            now < registration.correctionDeadlineAt)
      ) {
         const registrationPackage =
            source.ticketPackages.find(
               (item) => item.id === registration.ticketPackageId,
            ) ?? null;
         const draft = await eventRegistrationRepository.findOwned(
            registration.id,
            user.id,
         );
         const forms = draft ? mapSubmissionForms(draft.submissions) : [];
         return {
            action: 'RESUME' as const,
            code:
               registration.status === 'NEEDS_CORRECTION'
                  ? 'CORRECTION_REQUIRED'
                  : 'DRAFT_EXISTS',
            destinationUrl: null,
            package: registrationPackage
               ? mapPackage(registrationPackage)
               : null,
            packages,
            registrationId: registration.id,
            forms,
         };
      }
      if (
         registration?.status === 'NEEDS_CORRECTION' &&
         registration.correctionDeadlineAt &&
         now >= registration.correctionDeadlineAt
      ) {
         return {
            action: 'VIEW_REGISTRATION' as const,
            code: 'CORRECTION_DEADLINE_PASSED',
            destinationUrl: null,
            package: null,
            packages,
            registrationId: registration.id,
            forms: [],
         };
      }
      if (
         source.status !== 'OPEN' ||
         !source.isRegistrationOpen ||
         (source.registrationOpensAt && now < source.registrationOpensAt) ||
         (source.registrationClosesAt && now >= source.registrationClosesAt)
      ) {
         return {
            action: 'UNAVAILABLE' as const,
            code: 'REGISTRATION_CLOSED',
            destinationUrl: null,
            package: null,
            packages,
            registrationId: null,
            forms: [],
         };
      }
      if (registration && registration.status !== 'CANCELLED') {
         return {
            action: 'VIEW_REGISTRATION' as const,
            code: 'ACTIVE_REGISTRATION_EXISTS',
            destinationUrl: null,
            package: null,
            packages,
            registrationId: registration.id,
            forms: [],
         };
      }
      const available =
         eligiblePackages.length === 1 ? eligiblePackages[0] : undefined;
      if (eligiblePackages.length > 1)
         return {
            action: 'REGISTER' as const,
            code: 'PACKAGE_SELECTION_REQUIRED',
            destinationUrl: null,
            package: null,
            packages,
            registrationId: null,
            forms: [],
         };
      if (!available)
         return {
            action: 'REGISTER' as const,
            code: 'DEFAULT_PACKAGE_WILL_BE_PROVISIONED',
            destinationUrl: null,
            package: null,
            packages,
            registrationId: null,
            forms: [],
         };
      const forms = await eventRegistrationRepository.getAssignedForms(
         subEventId,
         available.id,
      );
      if (
         forms.some((assignment) =>
            assignment.form.questions.some(
               (question) => question.fieldType === 'FILE',
            ),
         )
      )
         throw unsupported(
            'UNSUPPORTED_FILE_QUESTION',
            'File questions are not supported by free registration MVP',
         );
      return {
         action: 'REGISTER' as const,
         code: 'ELIGIBLE',
         destinationUrl: null,
         package: mapPackage(available),
         packages,
         registrationId: null,
         forms: mapForms(forms),
      };
   }

   async create(
      subEventId: string,
      user: SessionUser,
      payload: CreateRegistrationRequest,
   ) {
      const context = await this.getContext(
         subEventId,
         user,
         payload.inviteToken,
      );
      if (context.action === 'VIEW_REGISTRATION')
         throw new AppError(
            'An active registration already exists',
            409,
            'ACTIVE_REGISTRATION_EXISTS',
         );
      if (!['REGISTER', 'RESUME'].includes(context.action))
         throw new AppError('Registration is unavailable', 409, context.code);
      const order = await eventRegistrationRepository
         .createOrResumeDraft(
            subEventId,
            user.id,
            payload,
            payload.inviteToken
               ? createHash('sha256').update(payload.inviteToken).digest('hex')
               : undefined,
         )
         .catch(translateConcurrencyError);
      if (!order)
         throw new AppError(
            'No active package is available',
            409,
            'PACKAGE_UNAVAILABLE',
         );
      if ('eligibilityCode' in order)
         throw new AppError(
            'Registration eligibility could not be verified',
            403,
            order.eligibilityCode,
         );
      if ('unsupportedCode' in order && order.unsupportedCode)
         throw unsupported(
            order.unsupportedCode,
            'This registration configuration is not supported by the free registration MVP',
         );
      if ('packageSelectionRequired' in order)
         throw new AppError(
            'Explicit packageId is required',
            400,
            'PACKAGE_SELECTION_REQUIRED',
         );
      if ('invitationCountMismatch' in order)
         throw new AppError(
            'Too many invitation emails',
            400,
            'INVITATION_COUNT_MISMATCH',
         );
      if ('invitationEmailConflict' in order)
         throw new AppError(
            'Invitation emails must be unique and cannot be the buyer email',
            409,
            'INVITATION_EMAIL_CONFLICT',
         );
      if ('capacityExceeded' in order)
         throw new AppError(
            'The selected package no longer fits available capacity',
            409,
            'CAPACITY_EXCEEDED',
         );
      if ('created' in order) {
         const detail = await mapDetail(order.created, user.id);
         return {
            ...detail,
            createdInvitations: order.initialInvitations.map((invitation) => ({
               registrationId: order.created.id,
               position: invitation.position,
               email: invitation.email,
               token: invitation.token,
               invitationPath: `/event-registration/invitations#token=${encodeURIComponent(invitation.token)}`,
            })),
         };
      }
      return mapDetail(order as DetailOrder, user.id);
   }

   async listMine(user: SessionUser, params: RegistrationPagination) {
      const { data, total } = await eventRegistrationRepository.listOwned(
         user.id,
         params,
      );
      return {
         data: data.map(mapSummary),
         meta: {
            page: params.page,
            limit: params.limit,
            totalRecords: total,
            totalPages: Math.ceil(total / params.limit),
         },
      };
   }

   async getMine(registrationId: string, user: SessionUser) {
      const order = await eventRegistrationRepository.findOwned(
         registrationId,
         user.id,
      );
      if (!order)
         throw new AppError(
            'Registration not found',
            404,
            'REGISTRATION_NOT_FOUND',
         );
      return mapDetail(order, user.id);
   }

   async replaceResponses(
      registrationId: string,
      user: SessionUser,
      payload: ReplaceResponsesRequest,
   ) {
      const result = await eventRegistrationRepository
         .replaceResponses(registrationId, user.id, payload)
         .catch(translateConcurrencyError);
      if (!result)
         throw new AppError(
            'Registration not found',
            404,
            'REGISTRATION_NOT_FOUND',
         );
      return mapDetail(result, user.id);
   }

   async submit(
      registrationId: string,
      user: SessionUser,
      idempotencyKey: string,
   ) {
      const fingerprint = createHash('sha256')
         .update(`${registrationId}:${user.id}:submit`)
         .digest('hex');
      const result = await eventRegistrationRepository
         .submit(registrationId, user.id, idempotencyKey, fingerprint)
         .catch(translateConcurrencyError);
      if (!result)
         throw new AppError(
            'Registration not found',
            404,
            'REGISTRATION_NOT_FOUND',
         );
      if ('idempotencyConflict' in result)
         throw new AppError(
            'Idempotency key was already used for another request',
            409,
            'IDEMPOTENCY_KEY_REUSED',
         );
      if ('lifecycleConflict' in result)
         throw new AppError(
            'Registration is not in a submittable state',
            409,
            'REGISTRATION_LIFECYCLE_CONFLICT',
         );
      if ('assignmentsMismatch' in result)
         throw new AppError(
            'Assigned registration forms are incomplete',
            409,
            'ASSIGNED_FORMS_MISMATCH',
         );
      if ('validationErrors' in result)
         throw new AppError(
            'Invalid form answers',
            400,
            'FORM_ANSWER_INVALID',
            {
               fieldErrors: result.validationErrors,
            },
         );
      if ('eligibilityCode' in result)
         throw new AppError(
            'Registration eligibility could not be verified',
            403,
            result.eligibilityCode,
         );
      if ('capacityExceeded' in result)
         throw new AppError(
            'Registration capacity is full',
            409,
            'CAPACITY_EXCEEDED',
         );
      if ('registrationClosed' in result)
         throw new AppError(
            'Registration is closed',
            409,
            'REGISTRATION_CLOSED',
         );
      if ('bundlePackage' in result)
         throw unsupported(
            'UNSUPPORTED_BUNDLE_PACKAGE',
            'Bundle packages are not supported by free registration MVP',
         );
      if ('membersIncomplete' in result)
         throw new AppError(
            'All package seats must be claimed before submission',
            409,
            'MEMBERS_INCOMPLETE',
         );
      if ('packageUnavailable' in result)
         throw new AppError(
            'The selected package is no longer available',
            409,
            'PACKAGE_UNAVAILABLE',
         );
      if (!result.order)
         throw new AppError(
            'Registration not found',
            404,
            'REGISTRATION_NOT_FOUND',
         );
      if (
         result.order.id !== registrationId ||
         (result.order.idempotencyFingerprint &&
            result.order.idempotencyFingerprint !== fingerprint)
      )
         throw new AppError(
            'Idempotency key was already used for another request',
            409,
            'IDEMPOTENCY_KEY_REUSED',
         );
      return mapDetail(result.order, user.id);
   }

   async cancel(registrationId: string, user: SessionUser, reason?: string) {
      const result = await eventRegistrationRepository
         .cancel(registrationId, user.id, reason)
         .catch(translateConcurrencyError);
      if (!result)
         throw new AppError(
            'Registration not found',
            404,
            'REGISTRATION_NOT_FOUND',
         );
      if ('deadlinePassed' in result)
         throw new AppError(
            'Cancellation deadline has passed',
            409,
            'CANCELLATION_DEADLINE_PASSED',
         );
      if ('unavailable' in result)
         throw new AppError(
            'Registration cannot be cancelled',
            409,
            'CANCELLATION_NOT_ALLOWED',
         );
      return mapDetail(result, user.id);
   }

   private mapInvitation(
      invitation: {
         id: string;
         registrationOrderId: string | null;
         slotPosition: number | null;
         email: string;
         status: string;
         expiresAt: Date;
      },
      token?: string,
   ) {
      return {
         id: invitation.id,
         registrationId: invitation.registrationOrderId!,
         position: invitation.slotPosition!,
         email: invitation.email,
         status: invitation.status,
         expiresAt: invitation.expiresAt.toISOString(),
         ...(token && {
            token,
            invitationPath: `/event-registration/invitations#token=${encodeURIComponent(token)}`,
         }),
      };
   }

   async invitationContext(token: string, user: SessionUser) {
      const result = await eventRegistrationRepository.invitationContext(
         createHash('sha256').update(token).digest('hex'),
         user.id,
      );
      if (!result)
         throw new AppError(
            'Invitation not found',
            404,
            'INVITATION_NOT_FOUND',
         );
      if ('eligibilityCode' in result)
         throw new AppError(
            'Verified invitation email is required',
            403,
            result.eligibilityCode,
         );
      if (result.status !== 'PENDING')
         throw new AppError(
            'Invitation is not pending',
            409,
            'INVITATION_NOT_PENDING',
         );
      const order = result.order!;
      return {
         invitation: this.mapInvitation(result),
         order: {
            id: order.id,
            orderNumber: order.orderNumber,
            status: order.status,
            event: order.event,
            subEvent: {
               ...order.subEvent,
               date: order.subEvent.date.toISOString(),
            },
            package: mapPackage(order.ticketPackage),
            buyer: order.buyer,
         },
      };
   }

   async createInvitation(
      registrationId: string,
      user: SessionUser,
      payload: import('./eventRegistrationTypes.js').CreateOrderInvitationRequest,
   ) {
      const { result, token } =
         await eventRegistrationRepository.createInvitation(
            registrationId,
            user.id,
            payload.email,
            payload.position,
         );
      if (!result)
         throw new AppError(
            'Registration not found',
            404,
            'REGISTRATION_NOT_FOUND',
         );
      if ('invalidPosition' in result)
         throw new AppError(
            'Position is outside package seats',
            400,
            'INVALID_SLOT_POSITION',
         );
      if ('occupied' in result)
         throw new AppError(
            'Invitation slot is occupied',
            409,
            'SLOT_OCCUPIED',
         );
      if ('emailConflict' in result)
         throw new AppError(
            'Invitation email is already live or belongs to the buyer',
            409,
            'INVITATION_EMAIL_CONFLICT',
         );
      return this.mapInvitation(result, token);
   }

   async resendInvitation(
      registrationId: string,
      invitationId: string,
      user: SessionUser,
      payload: import('./eventRegistrationTypes.js').ResendOrderInvitationRequest,
   ) {
      const result = await eventRegistrationRepository.resendInvitation(
         registrationId,
         invitationId,
         user.id,
         payload.email,
      );
      if (!result)
         throw new AppError(
            'Invitation not found',
            404,
            'INVITATION_NOT_FOUND',
         );
      if ('emailConflict' in result)
         throw new AppError(
            'Invitation email is already live or belongs to the buyer',
            409,
            'INVITATION_EMAIL_CONFLICT',
         );
      if ('conflict' in result)
         throw new AppError(
            'Invitation changed concurrently',
            409,
            'INVITATION_CONFLICT',
         );
      return this.mapInvitation(result.invitation, result.token);
   }

   async revokeInvitation(
      registrationId: string,
      invitationId: string,
      user: SessionUser,
   ) {
      const result = await eventRegistrationRepository.revokeInvitation(
         registrationId,
         invitationId,
         user.id,
      );
      if (!result)
         throw new AppError(
            'Invitation not found',
            404,
            'INVITATION_NOT_FOUND',
         );
      return this.mapInvitation(result);
   }

   async acceptInvitation(token: string, user: SessionUser) {
      const result = await eventRegistrationRepository.decideInvitation(
         createHash('sha256').update(token).digest('hex'),
         user.id,
         true,
      );
      if (!result)
         throw new AppError(
            'Invitation not found',
            404,
            'INVITATION_NOT_FOUND',
         );
      if ('eligibilityCode' in result)
         throw new AppError(
            'Verified invitation email is required',
            403,
            result.eligibilityCode,
         );
      if ('conflict' in result)
         throw new AppError(
            'Invitation claim conflicts with the roster',
            409,
            'INVITATION_CONFLICT',
         );
      if (!('orderNumber' in result))
         throw new AppError('Invitation conflict', 409, 'INVITATION_CONFLICT');
      return mapDetail(result, user.id);
   }

   async declineInvitation(token: string, user: SessionUser) {
      const result = await eventRegistrationRepository.decideInvitation(
         createHash('sha256').update(token).digest('hex'),
         user.id,
         false,
      );
      if (!result)
         throw new AppError(
            'Invitation not found',
            404,
            'INVITATION_NOT_FOUND',
         );
      if ('eligibilityCode' in result)
         throw new AppError(
            'Verified invitation email is required',
            403,
            result.eligibilityCode,
         );
      if ('conflict' in result)
         throw new AppError('Invitation conflict', 409, 'INVITATION_CONFLICT');
      if (!('email' in result))
         throw new AppError('Invitation conflict', 409, 'INVITATION_CONFLICT');
      return this.mapInvitation(result);
   }
}

export const eventRegistrationService = new EventRegistrationService();
