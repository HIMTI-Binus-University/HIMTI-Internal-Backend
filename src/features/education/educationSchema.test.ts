import assert from 'node:assert/strict';
import test from 'node:test';
import {
   CreateCourseGroupSchema,
   CreateResponsiSchema,
   ResponsiListQuerySchema,
   UpdateCourseGroupSchema,
   UpdateResponsiSchema,
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

test('create responsi validates required fields and enum values', () => {
   const invalid = CreateResponsiSchema.safeParse({
      title: '',
      course: 'Calculus',
      academicPeriod: '2026/2027',
      examType: 'Mid Exam',
      pic: 'Tester',
   });
   assert.equal(invalid.success, false);

   const invalidExamType = CreateResponsiSchema.safeParse({
      title: 'Valid Title',
      course: 'Calculus',
      academicPeriod: '2026/2027',
      examType: 'Quiz',
      pic: 'Tester',
   });
   assert.equal(invalidExamType.success, false);

   const valid = CreateResponsiSchema.safeParse({
      title: 'Limits & Continuity',
      course: 'Calculus',
      academicPeriod: '2026/2027',
      examType: 'Mid Exam',
      pic: 'Tester',
      content: '# Title',
   });
   assert.equal(valid.success, true);
});

test('responsi list query parses filters and pagination', () => {
   const query = ResponsiListQuerySchema.parse({
      search: 'calculus',
      examType: 'Mid Exam',
      status: 'PUBLISHED',
      page: '2',
      limit: '10',
   });
   assert.equal(query.search, 'calculus');
   assert.equal(query.examType, 'Mid Exam');
   assert.equal(query.status, 'PUBLISHED');
   assert.equal(query.page, 2);
   assert.equal(query.limit, 10);
});

test('update responsi allows partial fields and status changes', () => {
   const valid = UpdateResponsiSchema.safeParse({
      status: 'UNDER_REVIEW',
      content: 'Updated content',
   });
   assert.equal(valid.success, true);
});
