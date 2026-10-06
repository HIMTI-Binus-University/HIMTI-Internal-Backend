import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getElectionEligibilityReason, socsStudyProgramNames } from './electionTypes.js';

const binusUser = {
   status: 'ACTIVE' as const,
   registrationCompletedAt: new Date(),
   outlookEmail: 'student@binus.ac.id',
   outlookEmailVerified: true,
   studyProgram: { name: 'Computer Science - Regular Class' },
   memberType: 'STUDENT' as const,
   userHasRoles: [{ role: { roleName: 'SoCS Student', status: 'ACTIVE' } }],
};

describe('election eligibility', () => {
   it('allows verified SoCS members with student or lecturer domains', () => {
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

   it('requires a canonical related SoCS program, not editable profile text', () => {
      for (const studyProgram of [null, { name: 'Business Management' }, { name: 'School of Computer Science' }]) {
         assert.equal(getElectionEligibilityReason({ ...binusUser, studyProgram, ...{ department: 'SoCS', studyProgramName: 'Computer Science - Regular Class' } }), 'NOT_SOCS');
      }
      for (const name of socsStudyProgramNames) {
         assert.equal(getElectionEligibilityReason({ ...binusUser, studyProgram: { name } }), null);
      }
   });

   it('requires active admin-attested membership for students and lecturers', () => {
      assert.equal(getElectionEligibilityReason({ ...binusUser, userHasRoles: [] }), 'NOT_SOCS');
      assert.equal(getElectionEligibilityReason({ ...binusUser, userHasRoles: [{ role: { roleName: 'SoCS Student', status: 'INACTIVE' } }] }), 'NOT_SOCS');
      const lecturer = { ...binusUser, memberType: 'LECTURER' as const, studyProgram: null };
      assert.equal(getElectionEligibilityReason(lecturer), 'NOT_SOCS');
      assert.equal(getElectionEligibilityReason({ ...lecturer, userHasRoles: [{ role: { roleName: 'SoCS Lecturer', status: 'ACTIVE' } }] }), null);
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
