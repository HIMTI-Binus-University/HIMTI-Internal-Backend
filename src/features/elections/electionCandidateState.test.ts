import assert from 'node:assert/strict';
import { test } from 'node:test';
import { AppError } from '@/utils/appError.js';
import { assertCandidateEditable } from './electionRepository.js';

test('candidate edits are allowed while draft or open, but not after voting closes', () => {
   for (const status of ['DRAFT', 'OPEN'])
      assert.doesNotThrow(() => assertCandidateEditable(status));
   for (const status of ['CLOSED', 'PUBLISHED'])
      assert.throws(
         () => assertCandidateEditable(status),
         (error: unknown) =>
            error instanceof AppError &&
            error.statusCode === 409 &&
            error.code === 'INVALID_ELECTION_STATE',
      );
});
