import { z } from 'zod';
import {
   CancelEventRegistrationSchema,
   BundleRevisionSchema,
   CreateEventBundleSchema,
   CreateEventRegistrationSchema,
   EventRegistrationListSchema,
   InternalEventRegistrationListSchema,
   JoinEventBundleSchema,
   RemoveBundleMemberSchema,
   ReplaceRegistrationAnswersSchema,
} from './eventRegistrationSchema.js';

export type CreateEventRegistrationRequest = z.infer<
   typeof CreateEventRegistrationSchema
>;
export type CreateEventBundleRequest = z.infer<typeof CreateEventBundleSchema>;
export type JoinEventBundleRequest = z.infer<typeof JoinEventBundleSchema>;
export type BundleRevisionRequest = z.infer<typeof BundleRevisionSchema>;
export type RemoveBundleMemberRequest = z.infer<
   typeof RemoveBundleMemberSchema
>;
export type ReplaceRegistrationAnswersRequest = z.infer<
   typeof ReplaceRegistrationAnswersSchema
>;
export type CancelEventRegistrationRequest = z.infer<
   typeof CancelEventRegistrationSchema
>;
export type EventRegistrationListQuery = z.infer<
   typeof EventRegistrationListSchema
>;
export type InternalEventRegistrationListQuery = z.infer<
   typeof InternalEventRegistrationListSchema
>;
export type RegistrationAnswerInput =
   CreateEventRegistrationRequest['answers'][number];

export type ProfileSource = {
   name: string | null;
   email: string | null;
   outlookEmail: string | null;
   outlookEmailVerified: boolean;
   phoneNumber: string | null;
   nim: string | null;
   memberType: 'STUDENT' | 'LECTURER' | 'OTHER' | null;
   institutionType: 'BINUS' | 'NON_BINUS' | null;
   universityName: string | null;
   studyProgramName: string | null;
   department: string | null;
   affiliation: string | null;
   registrationCompletedAt: Date | null;
   university: { name: string } | null;
   studyProgram: { name: string } | null;
   region: { name: string } | null;
};

export type ResolvedProfile = {
   readOnly: true;
   complete: boolean;
   missingFields: string[];
   values: {
      name: string | null;
      nim: string | null;
      outlookEmail: string | null;
      email: string | null;
      university: string | null;
      studyProgram: string | null;
      region: string | null;
      phoneNumber: string | null;
   };
};

export type RegistrationQuestion = {
   id: string;
   fieldKey: string;
   type:
      | 'TEXT'
      | 'TEXTAREA'
      | 'NUMBER'
      | 'DATE'
      | 'SELECT'
      | 'RADIO'
      | 'CHECKBOX'
      | 'FILE';
   isRequired: boolean;
   validation: unknown;
   options: { id: string; value: string }[];
};

export type ValidatedAnswer = {
   questionId: string;
   textValue: string | null;
   numberValue: string | null;
   dateValue: Date | null;
   optionIds: string[];
};

const present = (value: unknown) =>
   typeof value === 'string' ? value.trim().length > 0 : value != null;

export const resolveRegistrationProfile = (
   user: ProfileSource,
): ResolvedProfile => {
   const values = {
      name: user.name,
      nim: user.nim,
      outlookEmail: user.outlookEmailVerified ? user.outlookEmail : null,
      email: user.email,
      university: user.university?.name ?? user.universityName,
      studyProgram: user.studyProgram?.name ?? user.studyProgramName,
      region: user.region?.name ?? null,
      phoneNumber: user.phoneNumber,
   };
   const required: (keyof typeof values)[] = [
      'name',
      'email',
      'university',
      'studyProgram',
      'phoneNumber',
   ];
   if (user.institutionType === 'BINUS')
      required.push('nim', 'outlookEmail', 'region');
   const missingFields = [
      ...(!user.institutionType ? ['institutionType'] : []),
      ...required.filter((field) => !present(values[field])),
   ];
   return {
      readOnly: true,
      complete: missingFields.length === 0,
      missingFields,
      values,
   };
};

const validationOf = (question: RegistrationQuestion) =>
   (question.validation ?? {}) as Record<string, unknown>;

export const validateRegistrationAnswers = (
   questions: RegistrationQuestion[],
   inputs: RegistrationAnswerInput[],
) => {
   const byId = new Map(questions.map((question) => [question.id, question]));
   if (questions.some(({ type }) => type === 'FILE'))
      throw new Error(
         'FILE questions are not supported for participant registration',
      );
   if (
      new Set(inputs.map(({ questionId }) => questionId)).size !== inputs.length
   )
      throw new Error('Each question may only be answered once');

   const answers = inputs.map(({ questionId, value }): ValidatedAnswer => {
      const question = byId.get(questionId);
      if (!question) throw new Error(`Unknown question: ${questionId}`);
      const validation = validationOf(question);
      const empty =
         value === null || (typeof value === 'string' && value.trim() === '');
      if (empty)
         return {
            questionId,
            textValue: null,
            numberValue: null,
            dateValue: null,
            optionIds: [],
         };
      if (question.type === 'TEXT' || question.type === 'TEXTAREA') {
         if (typeof value !== 'string')
            throw new Error(`${question.fieldKey} must be a string`);
         if (
            (typeof validation.minLength === 'number' &&
               value.length < validation.minLength) ||
            (typeof validation.maxLength === 'number' &&
               value.length > validation.maxLength)
         )
            throw new Error(`${question.fieldKey} has an invalid length`);
         return {
            questionId,
            textValue: value,
            numberValue: null,
            dateValue: null,
            optionIds: [],
         };
      }
      if (question.type === 'NUMBER') {
         if (typeof value !== 'number')
            throw new Error(`${question.fieldKey} must be a number`);
         if (
            (validation.integer === true && !Number.isInteger(value)) ||
            (typeof validation.min === 'number' && value < validation.min) ||
            (typeof validation.max === 'number' && value > validation.max)
         )
            throw new Error(
               `${question.fieldKey} is outside its allowed range`,
            );
         return {
            questionId,
            textValue: null,
            numberValue: String(value),
            dateValue: null,
            optionIds: [],
         };
      }
      if (question.type === 'DATE') {
         if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value))
            throw new Error(`${question.fieldKey} must be an ISO date`);
         const dateValue = new Date(`${value}T00:00:00.000Z`);
         if (
            Number.isNaN(dateValue.valueOf()) ||
            dateValue.toISOString().slice(0, 10) !== value
         )
            throw new Error(`${question.fieldKey} must be a valid date`);
         if (
            (typeof validation.min === 'string' && value < validation.min) ||
            (typeof validation.max === 'string' && value > validation.max)
         )
            throw new Error(
               `${question.fieldKey} is outside its allowed range`,
            );
         return {
            questionId,
            textValue: null,
            numberValue: null,
            dateValue,
            optionIds: [],
         };
      }
      const values = Array.isArray(value) ? value : [value];
      if (!values.every((item) => typeof item === 'string'))
         throw new Error(`${question.fieldKey} must use option values`);
      if (question.type !== 'CHECKBOX' && values.length !== 1)
         throw new Error(`${question.fieldKey} accepts exactly one option`);
      if (new Set(values).size !== values.length)
         throw new Error(`${question.fieldKey} contains duplicate options`);
      if (
         (typeof validation.minSelections === 'number' &&
            values.length < validation.minSelections) ||
         (typeof validation.maxSelections === 'number' &&
            values.length > validation.maxSelections)
      )
         throw new Error(`${question.fieldKey} has an invalid selection count`);
      const options = new Map(
         question.options.map((option) => [option.value, option.id]),
      );
      const optionIds = values.map((item) => options.get(item));
      if (optionIds.some((id) => !id))
         throw new Error(`${question.fieldKey} contains an invalid option`);
      return {
         questionId,
         textValue: null,
         numberValue: null,
         dateValue: null,
         optionIds: optionIds as string[],
      };
   });
   const answered = new Set(
      answers
         .filter((answer) =>
            Boolean(
               answer.textValue !== null ||
               answer.numberValue !== null ||
               answer.dateValue !== null ||
               answer.optionIds.length,
            ),
         )
         .map(({ questionId }) => questionId),
   );
   return {
      answers,
      requiredComplete: questions.every(
         (question) => !question.isRequired || answered.has(question.id),
      ),
   };
};
