import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getElectionEligibilityReason } from './electionTypes.js';

const binusUser = {
   status: 'ACTIVE' as const,
   registrationCompletedAt: new Date(),
   outlookEmail: 'student@binus.ac.id',
   outlookEmailVerified: true,
};

describe('election eligibility', () => {
   it('allows verified BINUS members regardless of program or department', () => {
      for (const outlookEmail of [
         'student@binus.ac.id',
         'lecturer@binus.edu',
      ]) {
         assert.equal(
            getElectionEligibilityReason({ ...binusUser, outlookEmail }),
            null,
         );
      }
   });

   it('rejects non-BINUS and lookalike email domains', () => {
      for (const outlookEmail of [
         'student@gmail.com',
         'student@binus.ac.id.attacker.com',
         'student@notbinus.edu',
         'student@binus.ac.id@attacker.com',
         '@binus.ac.id',
      ]) {
         assert.equal(
            getElectionEligibilityReason({ ...binusUser, outlookEmail }),
            'OUTLOOK_DOMAIN_NOT_ALLOWED',
         );
      }
   });

   it('rejects inactive, incomplete, and unverified accounts', () => {
      assert.equal(
         getElectionEligibilityReason({ ...binusUser, status: 'INACTIVE' }),
         'ACCOUNT_INACTIVE',
      );
      assert.equal(
         getElectionEligibilityReason({
            ...binusUser,
            registrationCompletedAt: null,
         }),
         'PROFILE_INCOMPLETE',
      );
      assert.equal(
         getElectionEligibilityReason({
            ...binusUser,
            outlookEmailVerified: false,
         }),
         'OUTLOOK_NOT_VERIFIED',
      );
   });
});
