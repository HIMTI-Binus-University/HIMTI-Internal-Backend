import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { AppError } from '@/utils/appError.js';
import { assertDebateScheduleEditable } from './electionService.js';

describe('election debate schedule state policy', () => {
   it('allows DRAFT and OPEN elections', () => {
      assert.doesNotThrow(() => assertDebateScheduleEditable('DRAFT'));
      assert.doesNotThrow(() => assertDebateScheduleEditable('OPEN'));
   });

   it('rejects CLOSED and PUBLISHED elections with the state conflict', () => {
      for (const status of ['CLOSED', 'PUBLISHED']) {
         assert.throws(
            () => assertDebateScheduleEditable(status),
            (error: unknown) =>
               error instanceof AppError &&
               error.statusCode === 409 &&
               error.code === 'INVALID_ELECTION_STATE',
         );
      }
   });
});
