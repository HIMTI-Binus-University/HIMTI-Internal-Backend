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
