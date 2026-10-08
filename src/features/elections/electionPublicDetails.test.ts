import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { AppError } from '@/utils/appError.js';
import { UpdateElectionPublicDetailsSchema } from './electionSchema.js';
import { assertPublicDetailsEditable } from './electionService.js';

describe('election public details', () => {
   it('strictly validates all public details', () => {
      assert.deepEqual(
         UpdateElectionPublicDetailsSchema.parse({
            title: '  Election title  ',
            slug: 'election-title',
            description: '  Description  ',
         }),
         {
            title: 'Election title',
            slug: 'election-title',
            description: 'Description',
         },
      );
      for (const body of [
         { title: 'Valid title', slug: 'valid-slug' },
         { title: 'No', slug: 'valid-slug', description: null },
         { title: 'Valid title', slug: 'Invalid Slug', description: null },
         {
            title: 'Valid title',
            slug: 'valid-slug',
            description: null,
            updatedBy: 'forged',
         },
      ]) {
         assert.equal(
            UpdateElectionPublicDetailsSchema.safeParse(body).success,
            false,
         );
      }
   });

   it('allows DRAFT and OPEN but rejects terminal states', () => {
      assert.doesNotThrow(() => assertPublicDetailsEditable('DRAFT'));
      assert.doesNotThrow(() => assertPublicDetailsEditable('OPEN'));
      for (const status of ['CLOSED', 'PUBLISHED']) {
         assert.throws(
            () => assertPublicDetailsEditable(status),
            (error: unknown) =>
               error instanceof AppError &&
               error.statusCode === 409 &&
               error.code === 'INVALID_ELECTION_STATE',
         );
      }
   });
});
