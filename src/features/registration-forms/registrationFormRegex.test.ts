import assert from 'node:assert/strict';
import test from 'node:test';
import { FormValidationSchema } from './registrationFormSchema.js';
import { validateRegistrationFormDraft } from './registrationFormService.js';

test('accepts safe regex metadata with a stable message', () => {
   assert.equal(
      FormValidationSchema.safeParse({
         pattern: '[A-Z]{2}[0-9]{4}',
         patternMessage: 'Use two letters followed by four digits',
      }).success,
      true,
   );
});

test('rejects unsafe, invalid, and unsupported regular expressions', () => {
   for (const pattern of ['(a+)+$', '[', '(?<name>a)', '(a)\\1']) {
      assert.equal(FormValidationSchema.safeParse({ pattern }).success, false);
   }
});

test('only text questions may carry pattern metadata', () => {
   const issues = validateRegistrationFormDraft({
      revision: 1,
      name: 'Form',
      stage: 'REGISTRATION',
      audience: 'BUYER',
      isRequired: true,
      blocksCheckIn: false,
      orderIndex: 0,
      opensAt: null,
      closesAt: null,
      sections: [
         {
            title: 'Details',
            questions: [
               {
                  label: 'Age',
                  fieldType: 'NUMBER',
                  isRequired: true,
                  validation: { pattern: '[0-9]+' },
                  options: [],
               },
            ],
         },
      ],
   });
   assert.ok(
      issues.some(
         (issue) =>
            issue.code === 'VALIDATION_NOT_APPLICABLE' &&
            issue.path.endsWith('.pattern'),
      ),
   );
});
