import type { z } from 'zod';
import type { auth } from '@/utils/auth.js';
import type {
   createEventRegistrationSchema,
   eventRegistrationPaginationSchema,
   bulkRegistrationDecisionSchema,
   internalRegistrationListSchema,
   registrationDecisionSchema,
   replaceRegistrationResponsesSchema,
} from './eventRegistrationSchema.js';

export type SessionUser = typeof auth.$Infer.Session.user;
export type RegistrationPagination = z.infer<
   typeof eventRegistrationPaginationSchema
>;
export type CreateRegistrationRequest = z.infer<
   typeof createEventRegistrationSchema
>;
export type ReplaceResponsesRequest = z.infer<
   typeof replaceRegistrationResponsesSchema
>;
export type InternalRegistrationListQuery = z.infer<
   typeof internalRegistrationListSchema
>;
export type RegistrationDecisionRequest = z.infer<
   typeof registrationDecisionSchema
>;
export type BulkRegistrationDecisionRequest = z.infer<
   typeof bulkRegistrationDecisionSchema
>;

export type EligibilityAction =
   | 'REGISTER'
   | 'RESUME'
   | 'VIEW_REGISTRATION'
   | 'SIGN_IN'
   | 'EXTERNAL'
   | 'UNAVAILABLE';

export const capacityConsumingStatuses = [
   'SUBMITTED',
   'PENDING_APPROVAL',
   'APPROVED',
] as const;

export const activeRegistrationStatuses = [
   'AWAITING_MEMBERS',
   'HOLDING',
   'SUBMITTED',
   'PENDING_PAYMENT',
   'PAYMENT_REVIEW',
   'PENDING_APPROVAL',
   'APPROVED',
   'NEEDS_CORRECTION',
   'WAITLISTED',
] as const;

export const terminalRegistrationStatuses = [
   'REJECTED',
   'EXPIRED',
   'CANCELLED',
] as const;

export class ResponseRevisionConflict extends Error {}
export class ResponseAccessDenied extends Error {}
export class ResponseValidationFailure extends Error {
   constructor(public readonly fieldErrors: AnswerValidationError[]) {
      super('Invalid form answers');
   }
}

export interface AnswerValidationError {
   questionId: string;
   code: string;
   message: string;
}

type ValidationMetadata = {
   minLength?: number;
   maxLength?: number;
   min?: number;
   max?: number;
   minSelections?: number;
   maxSelections?: number;
   minDate?: string;
   maxDate?: string;
};

type ValidationQuestion = {
   id: string;
   fieldType: string;
   isRequired: boolean;
   validation: unknown;
   options: { id: string }[];
};

type ValidationAnswer = {
   formQuestionId: string;
   textValue: string | null;
   numberValue: { toString(): string } | null;
   dateValue: Date | null;
   selectedOptions: { optionId: string }[];
};

export const validateFreshSubmission = (
   questions: ValidationQuestion[],
   answers: ValidationAnswer[],
   formRequired: boolean,
): AnswerValidationError[] => {
   if (!formRequired && answers.length === 0) return [];
   const errors: AnswerValidationError[] = [];
   const byQuestion = new Map(
      answers.map((answer) => [answer.formQuestionId, answer]),
   );
   for (const question of questions) {
      if (question.fieldType === 'FILE') {
         errors.push({
            questionId: question.id,
            code: 'UNSUPPORTED_FILE_QUESTION',
            message: 'File questions are not supported',
         });
         continue;
      }
      const answer = byQuestion.get(question.id);
      const selected =
         answer?.selectedOptions.map((item) => item.optionId) ?? [];
      const empty =
         !answer ||
         (['TEXT', 'TEXTAREA'].includes(question.fieldType) &&
            !answer.textValue?.trim()) ||
         (['SELECT', 'RADIO', 'CHECKBOX'].includes(question.fieldType) &&
            selected.length === 0) ||
         (question.fieldType === 'NUMBER' && answer.numberValue === null) ||
         (question.fieldType === 'DATE' && answer.dateValue === null);
      if (question.isRequired && empty) {
         errors.push({
            questionId: question.id,
            code: 'REQUIRED_ANSWER',
            message: 'Answer is required',
         });
         continue;
      }
      if (empty) continue;
      const validation = (question.validation ?? {}) as ValidationMetadata;
      const text = answer?.textValue ?? '';
      const number = answer?.numberValue
         ? Number(answer.numberValue.toString())
         : null;
      const date = answer?.dateValue?.toISOString().slice(0, 10) ?? null;
      const validOptions = new Set(question.options.map((option) => option.id));
      const invalid = (code: string, message: string) =>
         errors.push({ questionId: question.id, code, message });
      if (
         validation.minLength !== undefined &&
         text.length < validation.minLength
      )
         invalid('MIN_LENGTH', `Minimum length is ${validation.minLength}`);
      if (
         validation.maxLength !== undefined &&
         text.length > validation.maxLength
      )
         invalid('MAX_LENGTH', `Maximum length is ${validation.maxLength}`);
      if (
         validation.min !== undefined &&
         number !== null &&
         number < validation.min
      )
         invalid('MIN_VALUE', `Minimum value is ${validation.min}`);
      if (
         validation.max !== undefined &&
         number !== null &&
         number > validation.max
      )
         invalid('MAX_VALUE', `Maximum value is ${validation.max}`);
      if (
         validation.minSelections !== undefined &&
         selected.length < validation.minSelections
      )
         invalid(
            'MIN_SELECTIONS',
            `Select at least ${validation.minSelections} options`,
         );
      if (
         validation.maxSelections !== undefined &&
         selected.length > validation.maxSelections
      )
         invalid(
            'MAX_SELECTIONS',
            `Select at most ${validation.maxSelections} options`,
         );
      if (selected.some((optionId) => !validOptions.has(optionId)))
         invalid('INVALID_OPTION', 'Selected option is not valid');
      if (new Set(selected).size !== selected.length)
         invalid('DUPLICATE_OPTION', 'Selected options must be unique');
      if (validation.minDate && date && date < validation.minDate)
         invalid('MIN_DATE', `Date must be on or after ${validation.minDate}`);
      if (validation.maxDate && date && date > validation.maxDate)
         invalid('MAX_DATE', `Date must be on or before ${validation.maxDate}`);
   }
   return errors;
};

export const isTerminalRegistrationStatus = (status: string) =>
   (terminalRegistrationStatuses as readonly string[]).includes(status);
