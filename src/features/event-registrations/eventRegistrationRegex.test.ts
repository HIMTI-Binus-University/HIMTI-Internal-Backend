import assert from 'node:assert/strict';
import test from 'node:test';
import { validateFreshSubmission } from './eventRegistrationTypes.js';

test('answer regex has full-value semantics and uses patternMessage', () => {
   const errors = validateFreshSubmission(
      [
         {
            id: 'q1',
            fieldType: 'TEXT',
            isRequired: true,
            validation: {
               pattern: '[A-Z]{2}',
               patternMessage: 'Enter exactly two uppercase letters',
            },
            options: [],
         },
      ],
      [
         {
            formQuestionId: 'q1',
            textValue: 'XXmore',
            numberValue: null,
            dateValue: null,
            selectedOptions: [],
         },
      ],
      true,
   );
   assert.deepEqual(errors, [
      {
         questionId: 'q1',
         code: 'PATTERN_MISMATCH',
         message: 'Enter exactly two uppercase letters',
      },
   ]);
});
