import assert from 'node:assert/strict';
import test from 'node:test';
import { RegistrationFormBodySchema } from './registrationFormSchema.js';
import { registrationFormService } from './registrationFormService.js';

const form = (question: object) => ({
   name: 'Registration',
   sections: [{ title: 'Preferences', questions: [question] }],
});

test('form semantics reject reserved profile keys and duplicate field keys', () => {
   const profile = RegistrationFormBodySchema.parse(
      form({ fieldKey: 'name', label: 'Name', type: 'TEXT' }),
   );
   assert.throws(() => registrationFormService.validate(profile), /Reserved/);

   const duplicate = RegistrationFormBodySchema.parse({
      name: 'Registration',
      sections: [
         {
            title: 'One',
            questions: [{ fieldKey: 'diet', label: 'Diet', type: 'TEXT' }],
         },
         {
            title: 'Two',
            questions: [
               { fieldKey: 'diet', label: 'Diet again', type: 'TEXT' },
            ],
         },
      ],
   });
   assert.throws(() => registrationFormService.validate(duplicate), /unique/);
});
test('question types enforce option and validation semantics', () => {
   assert.equal(
      RegistrationFormBodySchema.safeParse(
         form({
            fieldKey: 'shirt_size',
            label: 'Shirt size',
            type: 'SELECT',
            options: [{ label: 'S', value: 's' }],
         }),
      ).success,
      false,
   );
   assert.equal(
      RegistrationFormBodySchema.safeParse(
         form({ fieldKey: 'diet', label: 'Diet', type: 'TEXT' }),
      ).success,
      true,
   );
   assert.equal(
      RegistrationFormBodySchema.safeParse(
         form({
            fieldKey: 'proof',
            label: 'Proof',
            type: 'FILE',
            validation: {
               acceptedTypes: ['image/png'],
               maxBytes: 1024,
            },
         }),
      ).success,
      true,
   );
});
