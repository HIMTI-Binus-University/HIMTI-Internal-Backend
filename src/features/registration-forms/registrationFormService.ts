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

const optionFieldTypes: readonly FormFieldType[] = [
   'SELECT',
   'RADIO',
   'CHECKBOX',
];

class RegistrationFormService {
   private async assertFormCanBeEdited(formId: string, status: string) {
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

      await this.assertFormCanBeEdited(question.form.id, question.form.status);

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

      await this.assertFormCanBeEdited(form.id, form.status);

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

      await this.assertFormCanBeEdited(form.id, form.status);

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
