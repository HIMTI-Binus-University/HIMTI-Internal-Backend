import assert from 'node:assert/strict';
import test from 'node:test';
import { educationRepository as repo } from './educationRepository.js';
import { educationService as service } from './educationService.js';
import {
   CreateResponsiSchema,
   ResponsiListQuerySchema,
   UpdateResponsiSchema,
} from './educationSchema.js';

const payload = {
   title: 'Summary type check',
   course: 'course-1',
   academicPeriod: '2026/2027',
   examType: 'Mid Exam',
   pic: 'Test',
   content: 'Test content',
};
const row = {
   id: 'summary-1',
   ...payload,
   summaryType: 'Study Club',
   status: 'DRAFT',
   semester: null,
   courseId: 'course-1',
   course: { id: 'course-1', name: 'Calculus', code: null },
   createdAt: new Date('2026-11-02T00:00:00Z'),
   updatedAt: null,
};

test('summary type defaults old clients to Responsi and validates create/update/filter values', () => {
   assert.equal(CreateResponsiSchema.parse(payload).summaryType, 'Responsi');
   assert.equal(
      CreateResponsiSchema.parse({ ...payload, summaryType: 'Study Club' })
         .summaryType,
      'Study Club',
   );
   for (const summaryType of ['Other', '', null]) {
      assert.equal(
         CreateResponsiSchema.safeParse({ ...payload, summaryType }).success,
         false,
      );
      assert.equal(
         UpdateResponsiSchema.safeParse({ summaryType }).success,
         false,
      );
      assert.equal(
         ResponsiListQuerySchema.safeParse({ summaryType }).success,
         false,
      );
   }
   assert.equal(
      UpdateResponsiSchema.parse({ title: 'Renamed' }).summaryType,
      undefined,
   );
});

test('summary type filter reaches both the paginated query and the total count', async (t) => {
   const list = t.mock.method(repo, 'listResponsies', async () => []);
   const count = t.mock.method(repo, 'countResponsies', async () => 0);
   await service.listResponsies(
      ResponsiListQuerySchema.parse({
         summaryType: 'Study Club',
         page: 2,
         limit: 6,
      }),
   );
   assert.deepEqual(list.mock.calls[0].arguments, [
      { summaryType: 'Study Club' },
      6,
      6,
   ]);
   assert.deepEqual(count.mock.calls[0].arguments, [
      { summaryType: 'Study Club' },
   ]);
   await service.listResponsies(ResponsiListQuerySchema.parse({}));
   assert.deepEqual(count.mock.calls[1].arguments, [{}]);
});

test('create and edit persist summary type; edits that omit it preserve existing classification', async (t) => {
   t.mock.method(repo, 'findCourseGroupById', async () => row.course);
   const create = t.mock.method(repo, 'createResponsi', async () => row);
   const created = await service.createResponsi(
      CreateResponsiSchema.parse({ ...payload, summaryType: 'Study Club' }),
   );
   assert.equal(created.summaryType, 'Study Club');
   assert.equal(create.mock.calls[0].arguments[0]?.summaryType, 'Study Club');
   t.mock.method(repo, 'findResponsiById', async () => row);
   const update = t.mock.method(repo, 'updateResponsi', async () => row);
   await service.updateResponsi(row.id, { title: 'Renamed' });
   const firstUpdate = update.mock.calls[0].arguments[1];
   assert.ok(firstUpdate);
   assert.equal('summaryType' in firstUpdate, false);
   await service.updateResponsi(row.id, { summaryType: 'Responsi' });
   assert.equal(update.mock.calls[1].arguments[1]?.summaryType, 'Responsi');
});
