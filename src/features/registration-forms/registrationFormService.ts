import type {
   FormFieldType,
   FormQuestion,
   FormQuestionOption,
   Prisma,
} from '@prisma/client';
import { auth } from '@/utils/auth.js';
import { AppError } from '@/utils/appError.js';
import { eventCommitteeService } from '@/features/event-committee/eventCommitteeService.js';
import { registrationFormRepository } from './registrationFormRepository.js';
import type {
   CreateFormQuestionOptionRequest,
   CreateFormQuestionRequest,
   ReorderFormQuestionsRequest,
   UpdateFormQuestionOptionRequest,
   UpdateFormQuestionRequest,
} from './registrationFormTypes.js';
import { generateUniqueFieldKey } from '@/utils/fieldKey.js';
import { randomUUID } from 'node:crypto';
import { getRegexValidationError } from '@/utils/safeRegex.js';
import type {
   CloneRegistrationFormV1Request,
   CreateRegistrationFormV1Request,
   FormValidationIssue,
   SaveRegistrationFormDraftV1Request,
   RegistrationFormLifecycleV1Request,
   DeleteRegistrationFormV1Request,
} from './registrationFormTypes.js';

const optionFieldTypes: readonly FormFieldType[] = [
   'SELECT',
   'RADIO',
   'CHECKBOX',
];

export const validateRegistrationFormDraft = (
   payload: SaveRegistrationFormDraftV1Request,
): FormValidationIssue[] => {
   const issues: FormValidationIssue[] = [];
   const fieldKeys = new Set<string>();
   const optionTypes = new Set<FormFieldType>(optionFieldTypes);
   const add = (code: string, path: string, message: string) =>
      issues.push({ code, path, message });

   if (
      payload.opensAt &&
      payload.closesAt &&
      payload.opensAt >= payload.closesAt
   )
      add(
         'FORM_WINDOW_INVALID',
         'opensAt',
         'The opening date must be before the closing date',
      );
   if (
      payload.stage === 'REGISTRATION' &&
      (payload.audience !== 'BUYER' ||
         !payload.isRequired ||
         payload.blocksCheckIn ||
         payload.opensAt ||
         payload.closesAt)
   )
      add(
         'REGISTRATION_CONFIGURATION_FIXED',
         'stage',
         'Registration forms must be completed by the buyer, required, always available, and cannot block check-in',
      );
   if (
      payload.blocksCheckIn &&
      (!payload.isRequired || payload.stage !== 'POST_REGISTRATION')
   )
      add(
         'CHECK_IN_BLOCK_INVALID',
         'blocksCheckIn',
         'Only a required post-registration form can block check-in',
      );

   if (!payload.sections.length)
      add(
         'FORM_EMPTY',
         'sections',
         'A publishable form must contain at least one active section',
      );

   payload.sections.forEach((section, sectionIndex) => {
      if (!section.questions.length)
         add(
            'SECTION_EMPTY',
            `sections.${sectionIndex}.questions`,
            'Every active section must contain a question',
         );
      section.questions.forEach((question, questionIndex) => {
         const path = `sections.${sectionIndex}.questions.${questionIndex}`;
         if (question.fieldKey) {
            if (fieldKeys.has(question.fieldKey))
               add(
                  'FIELD_KEY_DUPLICATE',
                  `${path}.fieldKey`,
                  'Field keys must be unique',
               );
            fieldKeys.add(question.fieldKey);
         }
         const values = new Set<string>();
         question.options.forEach((option, optionIndex) => {
            if (values.has(option.value))
               add(
                  'OPTION_VALUE_DUPLICATE',
                  `${path}.options.${optionIndex}.value`,
                  'Active option values must be unique within a question',
               );
            values.add(option.value);
         });
         if (optionTypes.has(question.fieldType) && question.options.length < 2)
            add(
               'OPTIONS_REQUIRED',
               `${path}.options`,
               'Option questions require at least two options',
            );
         if (!optionTypes.has(question.fieldType) && question.options.length)
            add(
               'OPTIONS_NOT_ALLOWED',
               `${path}.options`,
               'This field type cannot have options',
            );
         if (
            question.fieldType === 'CHECKBOX' &&
            question.validation.maxSelections !== undefined &&
            question.validation.maxSelections > question.options.length
         )
            add(
               'SELECTION_LIMIT_EXCEEDS_OPTIONS',
               `${path}.validation.maxSelections`,
               'maxSelections must not exceed the number of active options',
            );

         const validationKeys = Object.keys(question.validation);
         const allowed =
            question.fieldType === 'NUMBER'
               ? new Set(['min', 'max'])
               : question.fieldType === 'CHECKBOX'
                 ? new Set(['minSelections', 'maxSelections'])
                 : question.fieldType === 'FILE'
                   ? new Set(['allowedFileTypes', 'maxFileSizeMb', 'maxFiles'])
                   : question.fieldType === 'DATE'
                     ? new Set(['minDate', 'maxDate'])
                     : question.fieldType === 'TEXT' ||
                         question.fieldType === 'TEXTAREA'
                       ? new Set([
                            'minLength',
                            'maxLength',
                            'pattern',
                            'patternMessage',
                         ])
                       : new Set<string>();
         validationKeys.forEach((key) => {
            if (!allowed.has(key))
               add(
                  'VALIDATION_NOT_APPLICABLE',
                  `${path}.validation.${key}`,
                  `${key} is not valid for ${question.fieldType}`,
               );
         });
         if (
            typeof question.validation.pattern === 'string' &&
            (question.fieldType === 'TEXT' || question.fieldType === 'TEXTAREA')
         ) {
            const patternError = getRegexValidationError(
               question.validation.pattern,
            );
            if (patternError)
               add(
                  'PATTERN_INVALID',
                  `${path}.validation.pattern`,
                  patternError,
               );
         }
      });
   });
   return issues;
};

type DraftScope = {
   sectionIds: Set<string>;
   questionIds: Set<string>;
   optionQuestionIds: Map<string, string>;
};

export const getDraftScopeIssue = (
   payload: SaveRegistrationFormDraftV1Request,
   scope: DraftScope,
): { code: string; message: string } | null => {
   const seenSectionIds = new Set<string>();
   const seenQuestionIds = new Set<string>();
   const seenOptionIds = new Set<string>();
   for (const section of payload.sections) {
      if (section.id) {
         if (!scope.sectionIds.has(section.id))
            return {
               code: 'INVALID_SECTION_ID',
               message: 'Section does not belong to this form',
            };
         if (seenSectionIds.has(section.id))
            return {
               code: 'DUPLICATE_SECTION_ID',
               message: 'Section ids must be unique',
            };
         seenSectionIds.add(section.id);
      }
      for (const question of section.questions) {
         if (question.id) {
            if (!scope.questionIds.has(question.id))
               return {
                  code: 'INVALID_QUESTION_ID',
                  message: 'Question does not belong to this form',
               };
            if (seenQuestionIds.has(question.id))
               return {
                  code: 'DUPLICATE_QUESTION_ID',
                  message: 'Question ids must be unique',
               };
            seenQuestionIds.add(question.id);
         }
         for (const option of question.options) {
            if (!option.id) continue;
            const parentQuestionId = scope.optionQuestionIds.get(option.id);
            if (!parentQuestionId)
               return {
                  code: 'INVALID_OPTION_ID',
                  message: 'Option does not belong to this form',
               };
            if (!question.id || parentQuestionId !== question.id)
               return {
                  code: 'INVALID_OPTION_PARENT',
                  message: 'Option does not belong to the submitted question',
               };
            if (seenOptionIds.has(option.id))
               return {
                  code: 'DUPLICATE_OPTION_ID',
                  message: 'Option ids must be unique',
               };
            seenOptionIds.add(option.id);
         }
      }
   }
   return null;
};

export const assignDraftFieldKeys = (
   payload: SaveRegistrationFormDraftV1Request,
) => {
   const usedKeys = payload.sections.flatMap((section) =>
      section.questions.flatMap((question) =>
         question.fieldKey ? [question.fieldKey] : [],
      ),
   );
   return payload.sections.map((section) => ({
      ...section,
      questions: section.questions.map((question) => {
         const fieldKey =
            question.fieldKey ??
            generateUniqueFieldKey(question.label, usedKeys);
         usedKeys.push(fieldKey);
         return {
            ...question,
            fieldKey,
            validation: question.validation as Prisma.InputJsonValue,
         };
      }),
   }));
};

class RegistrationFormService {
   private getScope(
      form: Awaited<
         ReturnType<typeof registrationFormRepository.findBuilderFormById>
      >,
   ) {
      if (!form)
         throw new AppError(
            'Registration form not found',
            404,
            'FORM_NOT_FOUND',
         );
      return {
         sectionIds: new Set(form.sections.map((section) => section.id)),
         questionIds: new Set(
            form.sections.flatMap((section) =>
               section.questions.map((question) => question.id),
            ),
         ),
         optionQuestionIds: new Map(
            form.sections.flatMap((section) =>
               section.questions.flatMap((question) =>
                  question.options.map((option) => [option.id, question.id]),
               ),
            ),
         ),
      };
   }

   private assertPayloadScope(
      payload: SaveRegistrationFormDraftV1Request,
      form: NonNullable<
         Awaited<
            ReturnType<typeof registrationFormRepository.findBuilderFormById>
         >
      >,
   ) {
      const scopeIssue = getDraftScopeIssue(payload, this.getScope(form));
      if (scopeIssue)
         throw new AppError(scopeIssue.message, 400, scopeIssue.code);
   }
   private async getAuthorizedBuilderForm(
      id: string,
      user: typeof auth.$Infer.Session.user,
      mutate: boolean,
   ) {
      const form = await registrationFormRepository.findBuilderFormById(id);
      if (!form)
         throw new AppError(
            'Registration form not found',
            404,
            'FORM_NOT_FOUND',
         );
      if (mutate)
         await eventCommitteeService.assertEventSteeringCommitteeMemberOrAdmin(
            form.subEvent.eventId,
            user,
         );
      else
         await eventCommitteeService.assertEventCommitteeMemberOrAdmin(
            form.subEvent.eventId,
            user,
         );
      return form;
   }

   async listV1(subEventId: string, user: typeof auth.$Infer.Session.user) {
      const subEvent =
         await registrationFormRepository.findSubEventForForm(subEventId);
      if (!subEvent)
         throw new AppError('Sub-event not found', 404, 'SUB_EVENT_NOT_FOUND');
      await eventCommitteeService.assertEventCommitteeMemberOrAdmin(
         subEvent.eventId,
         user,
      );
      return await registrationFormRepository.findFormsBySubEventId(subEventId);
   }

   async getV1(id: string, user: typeof auth.$Infer.Session.user) {
      return await this.getAuthorizedBuilderForm(id, user, false);
   }

   async createV1(
      payload: CreateRegistrationFormV1Request,
      user: typeof auth.$Infer.Session.user,
   ) {
      const subEvent = await registrationFormRepository.findSubEventForForm(
         payload.subEventId,
      );
      if (!subEvent)
         throw new AppError('Sub-event not found', 404, 'SUB_EVENT_NOT_FOUND');
      await eventCommitteeService.assertEventSteeringCommitteeMemberOrAdmin(
         subEvent.eventId,
         user,
      );
      return await registrationFormRepository.createBuilderForm({
         subEventId: payload.subEventId,
         logicalKey: randomUUID(),
         name: payload.name,
         description: payload.description,
         stage: payload.stage,
         audience:
            payload.stage === 'REGISTRATION' ? 'BUYER' : payload.audience,
         isRequired:
            payload.stage === 'REGISTRATION' ? true : payload.isRequired,
         blocksCheckIn:
            payload.stage === 'POST_REGISTRATION' && payload.isRequired
               ? payload.blocksCheckIn
               : false,
         orderIndex: payload.orderIndex,
         opensAt:
            payload.stage === 'REGISTRATION' || !payload.opensAt
               ? null
               : new Date(payload.opensAt),
         closesAt:
            payload.stage === 'REGISTRATION' || !payload.closesAt
               ? null
               : new Date(payload.closesAt),
         createdBy: user.id,
      });
   }

   async validateV1(
      id: string,
      payload: SaveRegistrationFormDraftV1Request,
      user: typeof auth.$Infer.Session.user,
   ) {
      const form = await this.getAuthorizedBuilderForm(id, user, false);
      this.assertPayloadScope(payload, form);
      const issues = validateRegistrationFormDraft(payload);
      return { valid: issues.length === 0, revision: form.revision, issues };
   }

   async previewV1(
      id: string,
      payload: SaveRegistrationFormDraftV1Request,
      user: typeof auth.$Infer.Session.user,
   ) {
      const form = await this.getAuthorizedBuilderForm(id, user, false);
      this.assertPayloadScope(payload, form);
      const issues = validateRegistrationFormDraft(payload);
      return {
         ...payload,
         validation: {
            valid: issues.length === 0,
            issues,
         },
      };
   }

   async saveDraftV1(
      id: string,
      payload: SaveRegistrationFormDraftV1Request,
      user: typeof auth.$Infer.Session.user,
   ) {
      const form = await this.getAuthorizedBuilderForm(id, user, true);
      if (form.status !== 'DRAFT')
         throw new AppError(
            'Only draft forms can be edited',
            409,
            'FORM_NOT_DRAFT',
         );
      if (form.stage !== 'REGISTRATION' && form.stage !== 'POST_REGISTRATION')
         throw new AppError(
            'Legacy form stage must be saved as POST_REGISTRATION before publishing',
            409,
            'LEGACY_FORM_STAGE',
         );
      const issues = validateRegistrationFormDraft(payload);
      if (issues.length)
         throw new AppError(
            'Draft contains invalid form rules',
            400,
            'FORM_VALIDATION_FAILED',
            { issues },
         );

      this.assertPayloadScope(payload, form);

      const sections = assignDraftFieldKeys(payload);
      const saved = await registrationFormRepository.saveCompleteDraft(
         id,
         payload.revision,
         user.id,
         {
            name: payload.name,
            description: payload.description,
            stage: payload.stage,
            audience: payload.audience,
            isRequired: payload.isRequired,
            blocksCheckIn: payload.blocksCheckIn,
            orderIndex: payload.orderIndex,
            opensAt: payload.opensAt ? new Date(payload.opensAt) : null,
            closesAt: payload.closesAt ? new Date(payload.closesAt) : null,
         },
         sections,
      );
      if (!saved) {
         const current = await registrationFormRepository.findFormRevision(id);
         throw new AppError(
            'The draft changed since it was loaded',
            409,
            'REVISION_CONFLICT',
            {
               expectedRevision: payload.revision,
               currentRevision: current?.revision,
               currentStatus: current?.status,
            },
         );
      }
      return saved;
   }

   async cloneV1(
      id: string,
      payload: CloneRegistrationFormV1Request,
      user: typeof auth.$Infer.Session.user,
   ) {
      const form = await this.getAuthorizedBuilderForm(id, user, true);
      if (!form.logicalKey)
         throw new AppError(
            'Legacy form must be migrated before cloning',
            409,
            'FORM_NOT_VERSIONED',
         );
      return await registrationFormRepository.cloneIndependent(
         form,
         payload.name ?? form.name,
         user.id,
      );
   }

   async deleteV1(
      id: string,
      payload: DeleteRegistrationFormV1Request,
      user: typeof auth.$Infer.Session.user,
   ) {
      const form = await this.getAuthorizedBuilderForm(id, user, true);
      if (form.status !== 'DRAFT')
         throw new AppError(
            'Only draft forms can be deleted',
            409,
            'FORM_NOT_DRAFT',
         );
      const deleted = await registrationFormRepository.softDeleteDraft(
         id,
         payload.revision,
         user.id,
      );
      if (!deleted) {
         const current = await registrationFormRepository.findFormRevision(id);
         throw new AppError(
            'The draft changed since it was loaded',
            409,
            'REVISION_CONFLICT',
            {
               expectedRevision: payload.revision,
               currentRevision: current?.revision,
               currentStatus: current?.status,
            },
         );
      }
      return deleted;
   }

   async publishV1(
      id: string,
      payload: RegistrationFormLifecycleV1Request,
      user: typeof auth.$Infer.Session.user,
   ) {
      const form = await this.getAuthorizedBuilderForm(id, user, true);
      if (form.status !== 'DRAFT')
         throw new AppError(
            'Only draft forms can be published',
            409,
            'FORM_NOT_DRAFT',
         );
      if (form.stage !== 'REGISTRATION' && form.stage !== 'POST_REGISTRATION')
         throw new AppError(
            'Legacy form stage must be saved as POST_REGISTRATION before publishing',
            409,
            'LEGACY_FORM_STAGE',
         );
      const issues = validateRegistrationFormDraft({
         revision: form.revision,
         name: form.name,
         description: form.description,
         stage: form.stage,
         audience:
            form.audience === 'ALL_ORDER_MEMBERS'
               ? 'EACH_ATTENDEE'
               : form.audience,
         isRequired: form.isRequired,
         blocksCheckIn: form.blocksCheckIn,
         orderIndex: form.orderIndex,
         opensAt: form.opensAt?.toISOString() ?? null,
         closesAt: form.closesAt?.toISOString() ?? null,
         sections: form.sections
            .filter((s) => s.status === 'ACTIVE')
            .map((s) => ({
               id: s.id,
               title: s.title,
               description: s.description,
               questions: s.questions
                  .filter((q) => q.status === 'ACTIVE')
                  .map((q) => ({
                     id: q.id,
                     label: q.label,
                     fieldKey: q.fieldKey,
                     fieldType: q.fieldType,
                     isRequired: q.isRequired,
                     helpText: q.helpText,
                     validation: q.validation as Record<string, never>,
                     options: q.options
                        .filter((o) => o.isActive)
                        .map((o) => ({
                           id: o.id,
                           label: o.label,
                           value: o.value,
                        })),
                  })),
            })),
      });
      if (issues.length)
         throw new AppError(
            'Form is not publishable',
            400,
            'FORM_VALIDATION_FAILED',
            { issues },
         );
      try {
         return await registrationFormRepository.updateLifecycle(
            id,
            'DRAFT',
            payload.revision,
            'PUBLISHED',
            user.id,
         );
      } catch (error) {
         if (error instanceof AppError && error.code === 'LIFECYCLE_CONFLICT') {
            const current =
               await registrationFormRepository.findFormRevision(id);
            error.details = {
               expectedRevision: payload.revision,
               currentRevision: current?.revision,
               currentStatus: current?.status,
            };
         }
         throw error;
      }
   }

   async closeV1(
      id: string,
      payload: RegistrationFormLifecycleV1Request,
      user: typeof auth.$Infer.Session.user,
   ) {
      const form = await this.getAuthorizedBuilderForm(id, user, true);
      if (form.status !== 'PUBLISHED')
         throw new AppError(
            'Only published forms can be closed',
            409,
            'FORM_NOT_PUBLISHED',
         );
      try {
         return await registrationFormRepository.updateLifecycle(
            id,
            'PUBLISHED',
            payload.revision,
            'CLOSED',
            user.id,
         );
      } catch (error) {
         if (error instanceof AppError && error.code === 'LIFECYCLE_CONFLICT') {
            const current =
               await registrationFormRepository.findFormRevision(id);
            error.details = {
               expectedRevision: payload.revision,
               currentRevision: current?.revision,
               currentStatus: current?.status,
            };
         }
         throw error;
      }
   }

   async getPublishedV1(subEventId: string, logicalKey: string) {
      const form = await registrationFormRepository.findPublishedVersion(
         subEventId,
         logicalKey,
      );
      if (!form)
         throw new AppError(
            'Published registration form not found',
            404,
            'FORM_NOT_FOUND',
         );
      return {
         id: form.id,
         logicalKey: form.logicalKey,
         version: form.version,
         name: form.name,
         description: form.description,
         stage: form.stage,
         publishedAt: form.publishedAt,
         sections: form.sections
            .filter((s) => s.status === 'ACTIVE')
            .map((s) => ({
               id: s.id,
               title: s.title,
               description: s.description,
               orderIndex: s.orderIndex,
               questions: s.questions
                  .filter((q) => q.status === 'ACTIVE')
                  .map((q) => ({
                     id: q.id,
                     label: q.label,
                     fieldKey: q.fieldKey,
                     fieldType: q.fieldType,
                     isRequired: q.isRequired,
                     helpText: q.helpText,
                     validation: q.validation,
                     orderIndex: q.orderIndex,
                     options: q.options
                        .filter((o) => o.isActive)
                        .map((o) => ({
                           id: o.id,
                           label: o.label,
                           value: o.value,
                           orderIndex: o.orderIndex,
                        })),
                  })),
            })),
      };
   }
   private async assertFormCanBeEdited(
      formId: string,
      status: string,
      logicalKey: string | null,
   ) {
      if (logicalKey !== null)
         throw new AppError(
            'Versioned forms must be edited through the V1 draft API',
            409,
            'VERSIONED_FORM_REQUIRES_V1',
         );
      if (status !== 'DRAFT') {
         throw new AppError('Only draft forms can be edited', 400);
      }

      const responseCount =
         await registrationFormRepository.countResponsesForForm(formId);

      if (responseCount > 0) {
         throw new AppError(
            'Cannot edit form questions after responses exist',
            400,
         );
      }
   }

   private async getEditableQuestion(id: string) {
      const question = await registrationFormRepository.findQuestionById(id);

      if (!question) {
         throw new AppError('Form question not found', 404);
      }

      await this.assertFormCanBeEdited(
         question.form.id,
         question.form.status,
         question.form.logicalKey,
      );

      return question;
   }

   private async getEditableOption(id: string) {
      const option = await registrationFormRepository.findOptionById(id);

      if (!option) {
         throw new AppError('Form question option not found', 404);
      }

      await this.assertFormCanBeEdited(
         option.question.form.id,
         option.question.form.status,
         option.question.form.logicalKey,
      );

      return option;
   }

   private assertValidOptions(
      fieldType: FormFieldType,
      options: CreateFormQuestionRequest['options'],
   ) {
      if (
         optionFieldTypes.includes(fieldType) &&
         (!options || !options.length)
      ) {
         throw new AppError(
            'Option-based questions must have at least one option',
            400,
         );
      }
   }

   async createFormQuestion(
      payload: CreateFormQuestionRequest,
      formId: string,
      user: typeof auth.$Infer.Session.user,
   ): Promise<FormQuestion> {
      const form = await registrationFormRepository.findFormById(formId);

      if (!form) {
         throw new AppError('Registration form not found', 404);
      }

      await this.assertFormCanBeEdited(form.id, form.status, form.logicalKey);

      await eventCommitteeService.assertEventSteeringCommitteeMemberOrAdmin(
         form.subEvent.eventId,
         user,
      );

      this.assertValidOptions(payload.fieldType, payload.options);

      const existingQuestions =
         await registrationFormRepository.findQuestionsByFormId(form.id);
      const fieldKey = generateUniqueFieldKey(
         payload.label,
         existingQuestions.map((question) => question.fieldKey),
      );
      const nextOrderIndex =
         existingQuestions.length > 0
            ? Math.max(
                 ...existingQuestions.map((question) => question.orderIndex),
              ) + 1
            : 0;
      const shouldCreateOptions = optionFieldTypes.includes(payload.fieldType);

      const questionData: Prisma.FormQuestionCreateInput = {
         form: {
            connect: {
               id: form.id,
            },
         },
         label: payload.label,
         fieldKey,
         fieldType: payload.fieldType,
         isRequired: payload.isRequired,
         helpText: payload.helpText,
         orderIndex: payload.orderIndex ?? nextOrderIndex,
         creator: {
            connect: {
               id: user.id,
            },
         },
         options:
            shouldCreateOptions && payload.options
               ? {
                    create: payload.options.map((option) => ({
                       label: option.label,
                       value: option.value,
                       creator: {
                          connect: {
                             id: user.id,
                          },
                       },
                    })),
                 }
               : undefined,
      };

      return await registrationFormRepository.createQuestion(questionData);
   }

   async reorderFormQuestions(
      payload: ReorderFormQuestionsRequest,
      formId: string,
      user: typeof auth.$Infer.Session.user,
   ): Promise<FormQuestion[]> {
      const form = await registrationFormRepository.findFormById(formId);

      if (!form) {
         throw new AppError('Registration form not found', 404);
      }

      await this.assertFormCanBeEdited(form.id, form.status, form.logicalKey);

      await eventCommitteeService.assertEventSteeringCommitteeMemberOrAdmin(
         form.subEvent.eventId,
         user,
      );

      const uniqueQuestionIds = new Set(payload.questionIds);

      if (uniqueQuestionIds.size !== payload.questionIds.length) {
         throw new AppError('Question ids must be unique', 400);
      }

      const questions = await registrationFormRepository.findQuestionsByFormId(
         form.id,
      );
      const activeQuestionIds = questions
         .filter((question) => question.status === 'ACTIVE')
         .map((question) => question.id);
      const activeQuestionIdSet = new Set(activeQuestionIds);

      if (payload.questionIds.length !== activeQuestionIds.length) {
         throw new AppError('All active questions must be included', 400);
      }

      const hasInvalidQuestionId = payload.questionIds.some(
         (questionId) => !activeQuestionIdSet.has(questionId),
      );

      if (hasInvalidQuestionId) {
         throw new AppError('All question ids must belong to this form', 400);
      }

      return await registrationFormRepository.reorderQuestions(
         form.id,
         payload.questionIds,
         user.id,
      );
   }

   async updateFormQuestion(
      payload: UpdateFormQuestionRequest,
      id: string,
      user: typeof auth.$Infer.Session.user,
   ): Promise<FormQuestion> {
      const question = await this.getEditableQuestion(id);

      await eventCommitteeService.assertEventSteeringCommitteeMemberOrAdmin(
         question.form.subEvent.eventId,
         user,
      );

      const nextFieldType = payload.fieldType ?? question.fieldType;
      const activeOptionCount = question.options.filter(
         (option) => option.isActive,
      ).length;

      if (optionFieldTypes.includes(nextFieldType) && activeOptionCount === 0) {
         throw new AppError(
            'Option-based questions must have at least one active option',
            400,
         );
      }

      const updateData: Prisma.FormQuestionUpdateInput = {
         label: payload.label,
         fieldType: payload.fieldType,
         isRequired: payload.isRequired,
         helpText: payload.helpText,
         orderIndex: payload.orderIndex,
         status: payload.status,
         updater: {
            connect: {
               id: user.id,
            },
         },
      };

      return await registrationFormRepository.updateQuestion(id, updateData);
   }

   async deleteFormQuestion(
      id: string,
      user: typeof auth.$Infer.Session.user,
   ): Promise<FormQuestion> {
      const question = await this.getEditableQuestion(id);

      await eventCommitteeService.assertEventSteeringCommitteeMemberOrAdmin(
         question.form.subEvent.eventId,
         user,
      );

      return await registrationFormRepository.deleteQuestion(id, user.id);
   }

   async createFormQuestionOption(
      payload: CreateFormQuestionOptionRequest,
      questionId: string,
      user: typeof auth.$Infer.Session.user,
   ): Promise<FormQuestionOption> {
      const question = await this.getEditableQuestion(questionId);

      await eventCommitteeService.assertEventSteeringCommitteeMemberOrAdmin(
         question.form.subEvent.eventId,
         user,
      );

      if (!optionFieldTypes.includes(question.fieldType)) {
         throw new AppError(
            'Options can only be added to option-based questions',
            400,
         );
      }

      const existingOption =
         await registrationFormRepository.findActiveOptionByValue(
            question.id,
            payload.value,
         );

      if (existingOption) {
         throw new AppError('Option value must be unique', 400);
      }

      const optionData: Prisma.FormQuestionOptionCreateInput = {
         question: {
            connect: {
               id: question.id,
            },
         },
         label: payload.label,
         value: payload.value,
         creator: {
            connect: {
               id: user.id,
            },
         },
      };

      return await registrationFormRepository.createQuestionOption(optionData);
   }

   async updateFormQuestionOption(
      payload: UpdateFormQuestionOptionRequest,
      id: string,
      user: typeof auth.$Infer.Session.user,
   ): Promise<FormQuestionOption> {
      const option = await this.getEditableOption(id);

      await eventCommitteeService.assertEventSteeringCommitteeMemberOrAdmin(
         option.question.form.subEvent.eventId,
         user,
      );

      if (
         (payload.value && payload.value !== option.value) ||
         payload.isActive === true
      ) {
         const existingOption =
            await registrationFormRepository.findActiveOptionByValue(
               option.formQuestionId,
               payload.value ?? option.value,
               option.id,
            );

         if (existingOption) {
            throw new AppError('Option value must be unique', 400);
         }
      }

      const updateData: Prisma.FormQuestionOptionUpdateInput = {
         label: payload.label,
         value: payload.value,
         isActive: payload.isActive,
         updater: {
            connect: {
               id: user.id,
            },
         },
      };

      return await registrationFormRepository.updateQuestionOption(
         id,
         updateData,
      );
   }

   async deleteFormQuestionOption(
      id: string,
      user: typeof auth.$Infer.Session.user,
   ): Promise<FormQuestionOption> {
      const option = await this.getEditableOption(id);

      await eventCommitteeService.assertEventSteeringCommitteeMemberOrAdmin(
         option.question.form.subEvent.eventId,
         user,
      );

      if (
         optionFieldTypes.includes(option.question.fieldType) &&
         option.isActive
      ) {
         const activeOptionCount =
            await registrationFormRepository.countActiveOptionsForQuestion(
               option.formQuestionId,
            );

         if (activeOptionCount <= 1) {
            throw new AppError(
               'Option-based questions must have at least one active option',
               400,
            );
         }
      }

      return await registrationFormRepository.deleteQuestionOption(id, user.id);
   }
}

export const registrationFormService = new RegistrationFormService();
