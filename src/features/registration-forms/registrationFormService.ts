import { AppError } from '@/utils/appError.js';
import { eventService } from '@/features/events/eventService.js';
import { registrationFormRepository as repo } from './registrationFormRepository.js';
import type { RegistrationFormBody } from './registrationFormTypes.js';
import { reservedProfileKeys } from './registrationFormTypes.js';

type User = { id: string; roles?: unknown };
const bodyOf = (form: Awaited<ReturnType<typeof repo.latest>>) => {
   if (!form) throw new AppError('Registration form not found', 404);
   return {
      expectedRevision: form.revision,
      name: form.name,
      description: form.description,
      sections: form.sections.map((section) => ({
         title: section.title,
         description: section.description,
         questions: section.questions.map((question) => ({
            logicalId: question.logicalId,
            fieldKey: question.fieldKey,
            label: question.label,
            type: question.type,
            isRequired: question.isRequired,
            validation: question.validation,
            options: question.options.map(({ label, value }) => ({
               label,
               value,
            })),
         })),
      })),
   } as RegistrationFormBody;
};

class RegistrationFormService {
   async get(eventId: string, user: User) {
      await eventService.assertScope(eventId, user);
      const form = await repo.latest(eventId);
      if (!form) throw new AppError('Registration form not found', 404);
      return form;
   }
   validate(body: RegistrationFormBody) {
      const keys = body.sections.flatMap(({ questions }) =>
         questions.map(({ fieldKey }) => fieldKey),
      );
      const reserved = keys.find((key) => reservedProfileKeys.has(key));
      if (reserved)
         throw new AppError(`Reserved profile field key: ${reserved}`, 400);
      if (new Set(keys).size !== keys.length)
         throw new AppError(
            'Question field keys must be unique across the form',
            400,
         );
      for (const section of body.sections) {
         for (const question of section.questions) {
            const values = question.options.map(({ value }) => value);
            if (new Set(values).size !== values.length)
               throw new AppError(
                  `Option values must be unique for ${question.fieldKey}`,
                  400,
               );
            const validation = question.validation as Record<string, number>;
            if (
               validation.minLength > validation.maxLength ||
               validation.min > validation.max ||
               validation.minSelections > validation.maxSelections
            )
               throw new AppError(
                  `Invalid validation range for ${question.fieldKey}`,
                  400,
               );
         }
      }
      return { valid: true as const };
   }
   async put(eventId: string, body: RegistrationFormBody, user: User) {
      await eventService.assertScope(eventId, user);
      this.validate(body);
      return repo.save(eventId, body);
   }
   async validateCurrent(eventId: string, user: User) {
      return this.validate(bodyOf(await this.get(eventId, user)));
   }
   async preview(eventId: string, user: User) {
      const form = await this.get(eventId, user);
      this.validate(bodyOf(form));
      return { profileSection: { readOnly: true }, form };
   }
   async publish(eventId: string, user: User) {
      const form = await this.get(eventId, user);
      if (form.status !== 'DRAFT')
         throw new AppError(
            'Reload and edit the current published Registration Form; saving publishes changes and assigns additional questions automatically.',
            409,
         );
      if (
         form.sections.some(({ questions }) =>
            questions.some(({ type }) => type === 'FILE'),
         )
      )
         throw new AppError(
            'FILE questions cannot be published until private answer uploads are supported',
            422,
            'UNSUPPORTED_FILE_QUESTION',
         );
      this.validate(bodyOf(form));
      return repo.publish(eventId, form.id, form.revision);
   }
   async close(eventId: string, user: User) {
      const form = await this.get(eventId, user);
      if (form.status !== 'PUBLISHED')
         throw new AppError('Only a published form can be closed', 409);
      return repo.close(eventId, form.id, form.revision);
   }
}
export const registrationFormService = new RegistrationFormService();
