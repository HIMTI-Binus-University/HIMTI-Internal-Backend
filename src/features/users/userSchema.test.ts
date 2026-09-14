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
         const result = CompleteProfileSchema.safeParse(payload);
         assert.equal(result.success, true);
         if (result.success) {
            assert.equal(result.data.membershipPosition, 'MEMBER');
         }
      }
   });

   test('accepts membership positions and rejects invalid values', () => {
      const payload = {
         ...common,
         memberType: 'OTHER',
         institutionType: 'NON_BINUS',
         universityName: 'Example Organization',
         affiliation: 'Volunteer',
      };

      for (const membershipPosition of ['OFFICER', 'STAFF', 'MEMBER']) {
         assert.equal(
            CompleteProfileSchema.parse({ ...payload, membershipPosition })
               .membershipPosition,
            membershipPosition,
         );
      }
      assert.equal(
         CompleteProfileSchema.safeParse({
            ...payload,
            membershipPosition: 'CHAIRPERSON',
         }).success,
         false,
      );
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
   test('accepts complete BINUS and NON_BINUS repair paths', () => {
      const binus = UpdateProfileSchema.parse({
         ...common,
         institutionType: 'BINUS',
         universityId: 'binus-id',
         studyProgramId: 'program-id',
         regionId: 'region-id',
         nim: '2600000000',
      });
      const nonBinus = UpdateProfileSchema.parse({
         ...common,
         institutionType: 'NON_BINUS',
         universityName: '  Example University  ',
         studyProgramName: '  Computer Science  ',
      });

      assert.equal(binus.institutionType, 'BINUS');
      if (nonBinus.institutionType === 'NON_BINUS') {
         assert.equal(nonBinus.universityName, 'Example University');
         assert.equal(nonBinus.studyProgramName, 'Computer Science');
      }
   });

   test('rejects incomplete, opposite-path, membership, and server fields', () => {
      const invalidPayloads = [
         { ...common, institutionType: 'BINUS', universityId: 'binus-id' },
         {
            ...common,
            institutionType: 'NON_BINUS',
            universityName: 'University',
            studyProgramName: 'Program',
            nim: 'not-allowed',
         },
         {
            ...common,
            institutionType: 'NON_BINUS',
            universityName: 'University',
            studyProgramName: 'Program',
            memberType: 'STUDENT',
         },
         {
            ...common,
            institutionType: 'NON_BINUS',
            universityName: 'University',
            studyProgramName: 'Program',
            outlookEmailVerified: true,
         },
         {
            ...common,
            institutionType: 'NON_BINUS',
            universityName: 'University',
            studyProgramName: 'Program',
            registrationCompletedAt: new Date().toISOString(),
         },
      ];

      for (const payload of invalidPayloads) {
         assert.equal(UpdateProfileSchema.safeParse(payload).success, false);
      }
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
