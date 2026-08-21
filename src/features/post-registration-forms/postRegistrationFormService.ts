import type { auth } from '@/utils/auth.js';
import { AppError } from '@/utils/appError.js';
import { eventCommitteeService } from '@/features/event-committee/eventCommitteeService.js';
import { postRegistrationFormRepository } from './postRegistrationFormRepository.js';
import type {
   InternalPostRegistrationListQuery,
   PostRegistrationCorrection,
   SavePostRegistrationResponse,
} from './postRegistrationFormTypes.js';

type User = typeof auth.$Infer.Session.user;
type Assignment = NonNullable<
   Awaited<ReturnType<typeof postRegistrationFormRepository.findInternal>>
>;

const mapAnswer = (
   answer: Assignment['response'] extends null
      ? never
      : NonNullable<Assignment['response']>['answers'][number],
) => ({
   questionId: answer.formQuestionId,
   type: answer.question.fieldType,
   value:
      answer.question.fieldType === 'NUMBER'
         ? (answer.numberValue?.toString() ?? null)
         : answer.question.fieldType === 'DATE'
           ? (answer.dateValue?.toISOString().slice(0, 10) ?? null)
           : ['SELECT', 'RADIO', 'CHECKBOX'].includes(answer.question.fieldType)
             ? answer.selectedOptions.map((item) => item.optionId)
             : answer.textValue,
});

export const getPostRegistrationState = (
   assignment: Assignment,
   now = new Date(),
) => {
   const response = assignment.response;
   const correctionOpen =
      response?.status === 'NEEDS_CORRECTION' &&
      !!response.correctionDeadlineAt &&
      now < response.correctionDeadlineAt;
   const deadline =
      assignment.reopenDeadlineAt && now < assignment.reopenDeadlineAt
         ? assignment.reopenDeadlineAt
         : assignment.closesAt;
   const started = !!response?.answers.length;
   const complete =
      response?.status === 'LOCKED' || response?.status === 'SUBMITTED';
   const opened = !assignment.opensAt || now >= assignment.opensAt;
   const withinNormal = opened && (!deadline || now < deadline);
   return {
      availability: correctionOpen
         ? ('CORRECTION' as const)
         : complete
           ? ('COMPLETED' as const)
           : !opened
             ? ('UPCOMING' as const)
             : deadline && now >= deadline
               ? ('OVERDUE' as const)
               : ('OPEN' as const),
      completion:
         response?.status === 'NEEDS_CORRECTION'
            ? ('NEEDS_CORRECTION' as const)
            : complete
              ? ('LOCKED' as const)
              : started
                ? ('DRAFT' as const)
                : ('NOT_STARTED' as const),
      canEdit:
         assignment.order.status === 'APPROVED' &&
         (correctionOpen || withinNormal) &&
         !complete,
      canSubmit:
         assignment.order.status === 'APPROVED' &&
         (correctionOpen || withinNormal) &&
         !complete,
   };
};

const mapAssignment = (assignment: Assignment, answersVisible = true) => ({
   id: assignment.id,
   registrationId: assignment.registrationOrderId,
   formId: assignment.registrationFormId,
   logicalFormKey: assignment.logicalFormKey,
   formName: assignment.form.name,
   formDescription: assignment.form.description,
   version: assignment.form.version,
   memberId: assignment.orderMemberId,
   audience: assignment.audience,
   isRequired: assignment.isRequired,
   blocksCheckIn: assignment.blocksCheckIn,
   orderIndex: assignment.orderIndex,
   opensAt: assignment.opensAt?.toISOString() ?? null,
   closesAt: assignment.closesAt?.toISOString() ?? null,
   assignedAt: assignment.assignedAt.toISOString(),
   correctionReason: assignment.response?.correctionReason ?? null,
   correctionDeadlineAt:
      assignment.response?.correctionDeadlineAt?.toISOString() ?? null,
   reopenReason: assignment.reopenReason,
   reopenDeadlineAt: assignment.reopenDeadlineAt?.toISOString() ?? null,
   ...getPostRegistrationState(assignment),
   response: assignment.response
      ? {
           id: assignment.response.id,
           status: assignment.response.status,
           revision: assignment.response.revision,
           answers: answersVisible
              ? assignment.response.answers.map(mapAnswer)
              : [],
        }
      : null,
   sections: assignment.form.sections.map((section) => ({
      id: section.id,
      title: section.title,
      description: section.description,
      orderIndex: section.orderIndex,
      questions: assignment.form.questions
         .filter((question) => question.sectionId === section.id)
         .map((question) => ({
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
               orderIndex: option.orderIndex,
            })),
         })),
   })),
});

class PostRegistrationFormService {
   private assertWritable(assignment: Assignment) {
      if (!getPostRegistrationState(assignment).canEdit)
         throw new AppError(
            'Post-registration response is outside its writable window',
            409,
            'POST_REGISTRATION_UNAVAILABLE',
         );
      if (
         assignment.form.questions.some(
            (question) => question.fieldType === 'FILE',
         )
      )
         throw new AppError(
            'File questions require the form-answer upload workflow',
            409,
            'UNSUPPORTED_FILE_QUESTION',
         );
   }
   async listOwned(registrationId: string, user: User) {
      return (
         await postRegistrationFormRepository.listOwned(registrationId, user.id)
      ).map((item) => mapAssignment(item));
   }
   async detailOwned(registrationId: string, assignmentId: string, user: User) {
      const item = await postRegistrationFormRepository.findOwned(
         registrationId,
         assignmentId,
         user.id,
      );
      if (!item)
         throw new AppError(
            'Post-registration assignment not found',
            404,
            'POST_REGISTRATION_ASSIGNMENT_NOT_FOUND',
         );
      return mapAssignment(item);
   }
   async save(
      registrationId: string,
      assignmentId: string,
      user: User,
      payload: SavePostRegistrationResponse,
   ) {
      const current = await postRegistrationFormRepository.findOwned(
         registrationId,
         assignmentId,
         user.id,
      );
      if (!current)
         throw new AppError(
            'Post-registration assignment not found',
            404,
            'POST_REGISTRATION_ASSIGNMENT_NOT_FOUND',
         );
      this.assertWritable(current);
      const result = await postRegistrationFormRepository.save(
         registrationId,
         assignmentId,
         user.id,
         payload,
      );
      if (!result)
         throw new AppError(
            'Post-registration assignment not found',
            404,
            'POST_REGISTRATION_ASSIGNMENT_NOT_FOUND',
         );
      if ('conflict' in result)
         throw new AppError(
            'Response revision changed',
            409,
            'RESPONSE_REVISION_CONFLICT',
         );
      if ('validationErrors' in result)
         throw new AppError(
            'Invalid form answers',
            400,
            'ANSWER_VALIDATION_FAILED',
            { fieldErrors: result.validationErrors },
         );
      return mapAssignment(result);
   }
   async submit(
      registrationId: string,
      assignmentId: string,
      user: User,
      revision: number,
      key: string,
   ) {
      const current = await postRegistrationFormRepository.findOwned(
         registrationId,
         assignmentId,
         user.id,
      );
      if (!current)
         throw new AppError(
            'Post-registration assignment not found',
            404,
            'POST_REGISTRATION_ASSIGNMENT_NOT_FOUND',
         );
      const replay = current.response?.responseIdempotencyKey === key;
      if (!replay) this.assertWritable(current);
      const result = await postRegistrationFormRepository.submit(
         registrationId,
         assignmentId,
         user.id,
         revision,
         key,
      );
      if (!result)
         throw new AppError(
            'Post-registration assignment not found',
            404,
            'POST_REGISTRATION_ASSIGNMENT_NOT_FOUND',
         );
      if ('conflict' in result)
         throw new AppError(
            'Response revision changed',
            409,
            'RESPONSE_REVISION_CONFLICT',
         );
      if ('idempotencyConflict' in result)
         throw new AppError(
            'Idempotency key was already used',
            409,
            'IDEMPOTENCY_CONFLICT',
         );
      if ('validationErrors' in result)
         throw new AppError(
            'Invalid form answers',
            400,
            'ANSWER_VALIDATION_FAILED',
            { fieldErrors: result.validationErrors },
         );
      return mapAssignment(result);
   }
   private async assertInternal(item: Assignment, user: User) {
      const repository = (
         await import('@/features/event-registrations/eventRegistrationRepository.js')
      ).eventRegistrationRepository;
      const scope = await repository.getRegistrationScope(
         item.registrationOrderId,
      );
      if (!scope)
         throw new AppError(
            'Registration not found',
            404,
            'REGISTRATION_NOT_FOUND',
         );
      await eventCommitteeService.assertEventCommitteeMemberOrAdmin(
         scope.eventId,
         user,
      );
   }
   async listInternal(
      subEventId: string,
      user: User,
      query: InternalPostRegistrationListQuery,
   ) {
      const scope = await (
         await import('@/features/event-registrations/eventRegistrationRepository.js')
      ).eventRegistrationRepository.getSubEventScope(subEventId);
      if (!scope)
         throw new AppError('Sub-event not found', 404, 'SUB_EVENT_NOT_FOUND');
      await eventCommitteeService.assertEventCommitteeMemberOrAdmin(
         scope.eventId,
         user,
      );
      const canView = await (
         await import('@/features/event-registrations/eventRegistrationRepository.js')
      ).eventRegistrationRepository.hasPermission(
         user.id,
         'view_event_answers',
      );
      const result = await postRegistrationFormRepository.listInternal(
         subEventId,
         query,
      );
      const now = new Date();
      const complete = (item: (typeof result.all)[number]) =>
         ['LOCKED', 'SUBMITTED'].includes(item.response?.status ?? '');
      const overdue = (item: (typeof result.all)[number]) =>
         !complete(item) &&
         !!(item.reopenDeadlineAt ?? item.closesAt) &&
         now >= (item.reopenDeadlineAt ?? item.closesAt)!;
      return {
         data: result.data.map((item) => mapAssignment(item, canView)),
         summary: {
            total: result.all.length,
            completed: result.all.filter(complete).length,
            overdue: result.all.filter(overdue).length,
            requiredIncomplete: result.all.filter(
               (item) => item.isRequired && !complete(item),
            ).length,
            blockingIncomplete: result.all.filter(
               (item) => item.blocksCheckIn && !complete(item),
            ).length,
         },
         meta: {
            page: query.page,
            limit: query.limit,
            totalRecords: result.total,
            totalPages: Math.ceil(result.total / query.limit),
         },
      };
   }
   async detailInternal(id: string, user: User) {
      const item = await postRegistrationFormRepository.findInternal(id);
      if (!item)
         throw new AppError(
            'Post-registration assignment not found',
            404,
            'POST_REGISTRATION_ASSIGNMENT_NOT_FOUND',
         );
      await this.assertInternal(item, user);
      const canView = await (
         await import('@/features/event-registrations/eventRegistrationRepository.js')
      ).eventRegistrationRepository.hasPermission(
         user.id,
         'view_event_answers',
      );
      return mapAssignment(item, canView);
   }
   async correct(id: string, user: User, payload: PostRegistrationCorrection) {
      const item = await postRegistrationFormRepository.findInternal(id);
      if (!item)
         throw new AppError(
            'Post-registration assignment not found',
            404,
            'POST_REGISTRATION_ASSIGNMENT_NOT_FOUND',
         );
      await this.assertInternal(item, user);
      const deadline = new Date(payload.deadlineAt);
      if (deadline <= new Date())
         throw new AppError(
            'Correction deadline must be in the future',
            400,
            'INVALID_DEADLINE',
         );
      const result = await postRegistrationFormRepository.correct(
         id,
         user.id,
         payload.revision,
         payload.reason,
         deadline,
      );
      if (!result)
         throw new AppError(
            'Response must be locked at the expected revision',
            409,
            'RESPONSE_REVISION_CONFLICT',
         );
      return mapAssignment(result);
   }
   async reopen(id: string, user: User, payload: PostRegistrationCorrection) {
      const item = await postRegistrationFormRepository.findInternal(id);
      if (!item)
         throw new AppError(
            'Post-registration assignment not found',
            404,
            'POST_REGISTRATION_ASSIGNMENT_NOT_FOUND',
         );
      await this.assertInternal(item, user);
      const state = getPostRegistrationState(item);
      if (
         state.availability !== 'OVERDUE' ||
         !['NOT_STARTED', 'DRAFT'].includes(state.completion)
      )
         throw new AppError(
            'Only overdue unsubmitted assignments can be reopened',
            409,
            'ASSIGNMENT_NOT_REOPENABLE',
         );
      const deadline = new Date(payload.deadlineAt);
      if (deadline <= new Date())
         throw new AppError(
            'Reopen deadline must be in the future',
            400,
            'INVALID_DEADLINE',
         );
      await postRegistrationFormRepository.reopen(
         id,
         user.id,
         payload.revision,
         payload.reason,
         deadline,
      );
      return this.detailInternal(id, user);
   }
}
export const postRegistrationFormService = new PostRegistrationFormService();
