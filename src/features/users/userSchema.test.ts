import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
   CompleteProfileSchema,
   GetUserSchema,
   UpdateProfileSchema,
   UpdateUserSchema,
} from './userSchema.js';

const common = {
   name: 'HIMTI Member',
   phoneNumber: '08123456789',
   lineId: '',
};

describe('CompleteProfileSchema', () => {
   test('accepts all six membership paths', () => {
      const payloads = [
         {
            ...common,
            memberType: 'STUDENT',
            institutionType: 'BINUS',
            universityId: 'binus-id',
            regionId: 'region-id',
            outlookEmail: 'member@binus.ac.id',
            studyProgramId: 'program-id',
            nim: '2600000000',
            graduateBatch: '28',
         },
         {
            ...common,
            memberType: 'LECTURER',
            institutionType: 'BINUS',
            universityId: 'binus-id',
            regionId: 'region-id',
            outlookEmail: 'lecturer@binus.edu',
            department: 'Computer Science',
         },
         {
            ...common,
            memberType: 'OTHER',
            institutionType: 'BINUS',
            universityId: 'binus-id',
            regionId: 'region-id',
            outlookEmail: 'member@binus.ac.id',
            affiliation: 'Community member',
         },
         {
            ...common,
            memberType: 'STUDENT',
            institutionType: 'NON_BINUS',
            universityName: 'Example University',
            studyProgramName: 'Computer Science',
            nim: '12345',
         },
         {
            ...common,
            memberType: 'LECTURER',
            institutionType: 'NON_BINUS',
            universityName: 'Example University',
            department: 'Computing',
         },
         {
            ...common,
            memberType: 'OTHER',
            institutionType: 'NON_BINUS',
            universityName: 'Example Organization',
            affiliation: 'Volunteer',
         },
      ];

      for (const payload of payloads) {
         assert.equal(CompleteProfileSchema.safeParse(payload).success, true);
      }
   });

   test('requires fields for the selected path', () => {
      const result = CompleteProfileSchema.safeParse({
         ...common,
         memberType: 'STUDENT',
         institutionType: 'NON_BINUS',
      });

      assert.equal(result.success, false);
      if (!result.success) {
         assert.deepEqual(
            result.error.issues.map((issue) => issue.path[0]).sort(),
            ['nim', 'studyProgramName', 'universityName'],
         );
      }
   });
});

describe('UpdateProfileSchema', () => {
   test('rejects academic and membership fields', () => {
      const result = UpdateProfileSchema.safeParse({
         ...common,
         universityId: 'other-university',
         memberType: 'LECTURER',
      });

      assert.equal(result.success, false);
   });
});

describe('admin user schemas', () => {
   test('parses canonical filters and supported statuses', () => {
      const result = GetUserSchema.parse({
         status: 'SUSPENDED',
         memberType: 'STUDENT',
         institutionType: 'BINUS',
         regionId: 'region-id',
         verification: 'false',
         completed: 'true',
      });

      assert.equal(result.regionId, 'region-id');
      assert.equal(result.verification, false);
      assert.equal(result.completed, true);
   });

   test('accepts canonical admin update fields', () => {
      const result = UpdateUserSchema.parse({
         emailVerified: true,
         outlookEmail: 'member@binus.ac.id',
         outlookEmailVerified: false,
         status: 'SUSPENDED',
         memberType: 'STUDENT',
         institutionType: 'BINUS',
         universityId: 'university-id',
         studyProgramId: 'program-id',
         regionId: 'region-id',
      });

      assert.equal(result.emailVerified, true);
      assert.equal(result.regionId, 'region-id');
      assert.equal(result.outlookEmailVerified, false);
   });
});
