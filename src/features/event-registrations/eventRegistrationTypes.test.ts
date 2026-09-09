import assert from 'node:assert/strict';
import test from 'node:test';
import {
   resolveRegistrationProfile,
   validateRegistrationAnswers,
} from './eventRegistrationTypes.js';

const profile = {
   name: 'Participant',
   email: 'person@example.com',
   outlookEmail: 'person@binus.ac.id',
   outlookEmailVerified: true,
   phoneNumber: '08123456789',
   nim: '2600000000',
   memberType: 'STUDENT' as const,
   institutionType: 'BINUS' as const,
   universityName: null,
   studyProgramName: null,
   department: null,
   affiliation: null,
   registrationCompletedAt: new Date(),
   university: { name: 'BINUS University' },
   studyProgram: { name: 'Computer Science' },
   region: { name: 'Kemanggisan' },
};

test('profile resolution uses relations and reports path-specific gaps', () => {
   assert.deepEqual(resolveRegistrationProfile(profile), {
      readOnly: true,
      complete: true,
      missingFields: [],
      values: {
         name: 'Participant',
         nim: '2600000000',
         outlookEmail: 'person@binus.ac.id',
         email: 'person@example.com',
         university: 'BINUS University',
         studyProgram: 'Computer Science',
         region: 'Kemanggisan',
         phoneNumber: '08123456789',
      },
   });
   const incomplete = resolveRegistrationProfile({ ...profile, nim: null });
   assert.equal(incomplete.complete, false);
   assert.deepEqual(incomplete.missingFields, ['nim']);
});

test('profile resolution requires every approved event-registration field', () => {
   const binusLecturer = resolveRegistrationProfile({
      ...profile,
      memberType: 'LECTURER',
      nim: null,
      studyProgram: null,
      department: 'Computer Science',
   });
   assert.deepEqual(binusLecturer.missingFields, ['studyProgram', 'nim']);

   const nonBinus = resolveRegistrationProfile({
      ...profile,
      institutionType: 'NON_BINUS',
      memberType: 'OTHER',
      outlookEmail: null,
      outlookEmailVerified: false,
      nim: null,
      university: null,
      studyProgram: null,
      region: null,
      universityName: 'Other University',
      studyProgramName: null,
      affiliation: null,
   });
   assert.deepEqual(nonBinus.missingFields, ['studyProgram']);
});

test('typed answers validate options, ranges, required readiness and replacement', () => {
   const questions = [
      {
         id: 'number',
         fieldKey: 'age',
         type: 'NUMBER' as const,
         isRequired: true,
         validation: { min: 17, integer: true },
         options: [],
      },
      {
         id: 'size',
         fieldKey: 'size',
         type: 'SELECT' as const,
         isRequired: true,
         validation: {},
         options: [{ id: 'large', value: 'L' }],
      },
   ];
   const valid = validateRegistrationAnswers(questions, [
      { questionId: 'number', value: 18 },
      { questionId: 'size', value: 'L' },
   ]);
   assert.equal(valid.requiredComplete, true);
   assert.equal(valid.answers[1]?.optionIds[0], 'large');
   assert.equal(
      validateRegistrationAnswers(questions, []).requiredComplete,
      false,
   );
   assert.throws(
      () =>
         validateRegistrationAnswers(questions, [
            { questionId: 'number', value: 16 },
         ]),
      /allowed range/,
   );
   assert.throws(
      () =>
         validateRegistrationAnswers(questions, [
            { questionId: 'size', value: 'XL' },
         ]),
      /invalid option/,
   );
});

test('FILE questions fail readiness with a clear participant error', () => {
   assert.throws(
      () =>
         validateRegistrationAnswers(
            [
               {
                  id: 'file',
                  fieldKey: 'proof',
                  type: 'FILE',
                  isRequired: true,
                  validation: {},
                  options: [],
               },
            ],
            [],
         ),
      /FILE questions are not supported for participant registration/,
   );
});
