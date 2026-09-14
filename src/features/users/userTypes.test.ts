import assert from 'node:assert/strict';
import test from 'node:test';
import { buildProfileUpdateData } from './userTypes.js';

const contact = {
   name: 'Member',
   phoneNumber: '08123456789',
   lineId: '',
};

test('profile repair clears fields from the opposite institution path', () => {
   const binus = buildProfileUpdateData(
      {
         ...contact,
         institutionType: 'BINUS',
         universityId: 'binus-id',
         studyProgramId: 'program-id',
         regionId: 'region-id',
         nim: '2600000000',
      },
      'user-id',
   );
   const nonBinus = buildProfileUpdateData(
      {
         ...contact,
         institutionType: 'NON_BINUS',
         universityName: 'University',
         studyProgramName: 'Program',
      },
      'user-id',
   );

   assert.equal(binus.universityName, null);
   assert.equal(binus.studyProgramName, null);
   assert.equal(nonBinus.universityId, null);
   assert.equal(nonBinus.studyProgramId, null);
   assert.equal(nonBinus.regionId, null);
   assert.equal(nonBinus.nim, null);
   assert.equal(nonBinus.outlookEmail, null);
   assert.equal(nonBinus.outlookEmailVerified, false);
   assert.equal('memberType' in nonBinus, false);
   assert.equal('registrationCompletedAt' in nonBinus, false);
});
