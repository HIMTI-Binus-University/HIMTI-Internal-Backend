import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getElectionEligibilityReason } from './electionTypes.js';

const eligibleStudent = {
   status: 'ACTIVE' as const,
   registrationCompletedAt: new Date(),
   outlookEmail: 'student@binus.ac.id',
   outlookEmailVerified: true,
   memberType: 'STUDENT' as const,
   studyProgramName: null,
   department: null,
   studyProgram: { name: 'Computer Science - Global Class' },
};

describe('election eligibility', () => {
   it('accepts approved student programs from the canonical relation', () => {
      for (const name of [
         'Computer Science - Regular Class',
         'Data Science',
         'Game Application and Technology',
      ]) {
         assert.equal(
            getElectionEligibilityReason({
               ...eligibleStudent,
               studyProgram: { name },
            }),
            null,
         );
      }
   });

   it('accepts a verified School of Computer Science lecturer', () => {
      assert.equal(
         getElectionEligibilityReason({
            ...eligibleStudent,
            outlookEmail: 'lecturer@binus.edu',
            memberType: 'LECTURER',
            studyProgram: null,
            department: '  School   of Computer Science ',
         }),
         null,
      );
   });

   it('rejects lookalike domains and unrelated programs', () => {
      assert.equal(
         getElectionEligibilityReason({
            ...eligibleStudent,
            outlookEmail: 'student@binus.ac.id.attacker.com',
         }),
         'OUTLOOK_DOMAIN_NOT_ALLOWED',
      );
      assert.equal(
         getElectionEligibilityReason({
            ...eligibleStudent,
            studyProgram: { name: 'Cyber Security' },
         }),
         'NOT_COMPUTER_SCIENCE',
      );
   });

   it('denies incomplete and unverified profiles before affiliation checks', () => {
      assert.equal(
         getElectionEligibilityReason({
            ...eligibleStudent,
            registrationCompletedAt: null,
         }),
         'PROFILE_INCOMPLETE',
      );
      assert.equal(
         getElectionEligibilityReason({
            ...eligibleStudent,
            outlookEmailVerified: false,
         }),
         'OUTLOOK_NOT_VERIFIED',
      );
   });
});
