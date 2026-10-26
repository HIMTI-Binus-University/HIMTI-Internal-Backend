import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
   getElectionEligibilityReason,
   socsStudyProgramNames,
} from './electionTypes.js';

const binusUser = {
   status: 'ACTIVE' as const,
   registrationCompletedAt: new Date(),
   outlookEmail: 'student@binus.ac.id',
   outlookEmailVerified: true,
   studyProgram: { name: 'Computer Science - Regular Class' },
   memberType: 'STUDENT' as const,
   institutionType: 'BINUS' as const,
   department: null as string | null,
};

describe('election eligibility', () => {
   const otherUser = {
      ...binusUser,
      memberType: 'OTHER' as const,
      outlookEmail: 'staff@binus.edu',
      studyProgram: null,
      department: null,
   };

   it('allows BINUS OTHER members with verified binus.edu email without SoCS affiliation', () => {
      for (const outlookEmail of ['staff@binus.edu', ' STAFF@BINUS.EDU ']) {
         assert.equal(
            getElectionEligibilityReason({ ...otherUser, outlookEmail }),
            null,
         );
      }
   });

   it('restricts OTHER members to binus.edu even with a SoCS study program', () => {
      for (const outlookEmail of [
         'staff@binus.ac.id',
         'staff@gmail.com',
         'staff@binus.edu.attacker.com',
         'staff@notbinus.edu',
         'staff@binus.edu@attacker.com',
         '@binus.edu',
      ]) {
         assert.equal(
            getElectionEligibilityReason({
               ...otherUser,
               outlookEmail,
               studyProgram: binusUser.studyProgram,
            }),
            'OUTLOOK_DOMAIN_NOT_ALLOWED',
         );
      }
   });

   it('keeps account, verification, and BINUS requirements for OTHER members', () => {
      const cases = [
         [{ institutionType: 'NON_BINUS' }, 'NOT_SOCS'],
         [{ institutionType: null }, 'NOT_SOCS'],
         [{ memberType: null }, 'NOT_SOCS'],
         [{ status: 'INACTIVE' }, 'ACCOUNT_INACTIVE'],
         [{ status: 'SUSPENDED' }, 'ACCOUNT_INACTIVE'],
         [{ registrationCompletedAt: null }, 'PROFILE_INCOMPLETE'],
         [{ outlookEmailVerified: false }, 'OUTLOOK_NOT_VERIFIED'],
         [{ outlookEmail: null }, 'OUTLOOK_NOT_VERIFIED'],
      ] as const;
      for (const [overrides, reason] of cases) {
         assert.equal(
            getElectionEligibilityReason({ ...otherUser, ...overrides }),
            reason,
         );
      }
   });

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
      for (const studyProgram of [
         null,
         { name: 'Business Management' },
         { name: 'School of Computer Science' },
      ]) {
         assert.equal(
            getElectionEligibilityReason({
               ...binusUser,
               studyProgram,
               ...{
                  department: 'SoCS',
                  studyProgramName: 'Computer Science - Regular Class',
               },
            }),
            'NOT_SOCS',
         );
      }
      for (const name of socsStudyProgramNames) {
         assert.equal(
            getElectionEligibilityReason({
               ...binusUser,
               studyProgram: { name },
            }),
            null,
         );
      }
   });

   it('accepts lecturer department aliases without special roles', () => {
      const lecturer = {
         ...binusUser,
         memberType: 'LECTURER' as const,
         studyProgram: null,
      };
      assert.equal(getElectionEligibilityReason(lecturer), 'NOT_SOCS');
      for (const department of [
         'SOCS',
         'School of Computer Science',
         'Computer Science',
         'Cybersecurity department',
         'Department of Cyber Security',
         '  Data   Science  ',
         'Game Application and Technology',
         'Study Program of Artificial Intelligence',
      ]) {
         assert.equal(
            getElectionEligibilityReason({ ...lecturer, department }),
            null,
            department,
         );
      }
      for (const department of [
         'Business',
         'Not Computer Science',
         'Computer Science and Business',
      ]) {
         assert.equal(
            getElectionEligibilityReason({ ...lecturer, department }),
            'NOT_SOCS',
         );
      }
      assert.equal(
         getElectionEligibilityReason({
            ...binusUser,
            institutionType: 'NON_BINUS',
         }),
         'NOT_SOCS',
      );
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
