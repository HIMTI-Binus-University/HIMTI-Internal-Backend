import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
   replaceRegistrationResponsesSchema,
   typedAnswerSchema,
} from './eventRegistrationSchema.js';

describe('event registration answer contract', () => {
   it('accepts typed non-file answers and complete replacement batches', () => {
      assert.equal(
         replaceRegistrationResponsesSchema.safeParse({
            submissions: [
               {
                  submissionId: 'submission-1',
                  revision: 1,
                  answers: [
                     { questionId: 'q1', type: 'TEXT', value: 'HIMTI' },
                     { questionId: 'q2', type: 'NUMBER', value: '7.25' },
                     { questionId: 'q3', type: 'CHECKBOX', optionIds: ['o1'] },
                  ],
               },
            ],
         }).success,
         true,
      );
   });

   it('does not expose a FILE answer variant', () => {
      assert.equal(
         typedAnswerSchema.safeParse({
            questionId: 'q1',
            type: 'FILE',
            value: 'secret-key',
         }).success,
         false,
      );
   });

   it('bounds and deduplicates replacement identifiers and decimal precision', () => {
      assert.equal(
         replaceRegistrationResponsesSchema.safeParse({
            submissions: [
               {
                  submissionId: 'same',
                  revision: 1,
                  answers: [
                     {
                        questionId: 'q',
                        type: 'CHECKBOX',
                        optionIds: ['o', 'o'],
                     },
                  ],
               },
               { submissionId: 'same', revision: 1, answers: [] },
            ],
         }).success,
         false,
      );
      assert.equal(
         typedAnswerSchema.safeParse({
            questionId: 'q',
            type: 'NUMBER',
            value: '123456789012345678901.12345678901',
         }).success,
         false,
      );
   });
});
