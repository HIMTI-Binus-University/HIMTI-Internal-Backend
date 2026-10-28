import assert from 'node:assert/strict';
import test from 'node:test';
import {
   CreateCourseGroupSchema,
   UpdateCourseGroupSchema,
} from './educationSchema.js';

test('create course group requires valid name and trims whitespace', () => {
   assert.equal(CreateCourseGroupSchema.safeParse({ name: '   ' }).success, false);
   assert.equal(CreateCourseGroupSchema.safeParse({ name: '' }).success, false);

   const valid = CreateCourseGroupSchema.safeParse({
      name: '  Data Structures  ',
      code: '  CS-201  ',
   });
   assert.equal(valid.success, true);
   if (valid.success) {
      assert.equal(valid.data.name, 'Data Structures');
      assert.equal(valid.data.code, 'CS-201');
   }
});

test('update course group allows optional fields', () => {
   assert.equal(UpdateCourseGroupSchema.safeParse({}).success, true);
   const withStatus = UpdateCourseGroupSchema.safeParse({
      status: 'INACTIVE',
   });
   assert.equal(withStatus.success, true);
});
