import assert from 'node:assert/strict';
import test from 'node:test';
import { generateOpenApiDocument } from '@/docs/openapi.js';
import {
   CreateStudyClubSchema,
   StudyClubListQuerySchema,
   UpdateStudyClubSchema,
} from './studyClubSchema.js';

const session = {
   title: 'Practice session',
   type: 'Study Club',
   courseId: 'course-1',
   description: '',
   startsAt: '2099-11-04T10:00:00+07:00',
   endsAt: '2099-11-04T12:00:00+07:00',
   location: 'Room 301',
   meetingUrl: '',
   registrationUrl: '',
   capacity: null,
};

test('Study Club validates schedules, links, capacity and server-controlled fields', () => {
   assert.equal(CreateStudyClubSchema.safeParse(session).success, true);
   for (const invalid of [
      { title: '   ' },
      { type: 'Other' },
      { courseId: '' },
      { startsAt: '2099-11-04T10:00' },
      { endsAt: session.startsAt },
      { endsAt: '2020-01-01T10:00:00Z' },
      { capacity: 0 },
      { capacity: 1.5 },
      { capacity: 2_147_483_648 },
      { location: '', meetingUrl: '' },
      { meetingUrl: 'javascript:alert(1)' },
      { registrationUrl: 'https://user:password@example.com' },
      { isDemo: true },
      { createdBy: 'someone-else' },
   ])
      assert.equal(
         CreateStudyClubSchema.safeParse({ ...session, ...invalid }).success,
         false,
         JSON.stringify(invalid),
      );
   assert.equal(
      CreateStudyClubSchema.safeParse({
         ...session,
         location: '',
         meetingUrl: 'https://example.com/meeting',
      }).success,
      true,
   );
});

test('Study Club supports bounded pagination and partial updates', () => {
   assert.deepEqual(
      StudyClubListQuerySchema.parse({
         page: '2',
         limit: '6',
         schedule: 'past',
      }),
      { page: 2, limit: 6, schedule: 'past' },
   );
   assert.equal(
      StudyClubListQuerySchema.safeParse({ limit: 101 }).success,
      false,
   );
   assert.equal(
      StudyClubListQuerySchema.safeParse({ page: -1 }).success,
      false,
   );
   assert.equal(
      UpdateStudyClubSchema.safeParse({ title: 'Renamed' }).success,
      true,
   );
   assert.equal(UpdateStudyClubSchema.safeParse({}).success, false);
   assert.equal(
      UpdateStudyClubSchema.safeParse({ isDemo: true }).success,
      false,
   );
});

test('both session links require complete HTTP(S) URLs on create and update', () => {
   for (const field of ['meetingUrl', 'registrationUrl']) {
      for (const value of [
         'plain text',
         'example.com',
         'https:example.com',
         'https:///example.com',
         'ftp://example.com',
         'javascript:alert(1)',
         'https://example.com/a b',
         'https://user:password@example.com',
      ]) {
         assert.equal(
            CreateStudyClubSchema.safeParse({ ...session, [field]: value })
               .success,
            false,
            `${field}: ${value}`,
         );
         assert.equal(
            UpdateStudyClubSchema.safeParse({ [field]: value }).success,
            false,
            `${field}: ${value}`,
         );
      }
      for (const value of [
         '',
         'https://example.com/session?q=1',
         'http://localhost:3000/meeting',
      ]) {
         assert.equal(
            CreateStudyClubSchema.safeParse({ ...session, [field]: value })
               .success,
            true,
         );
         assert.equal(
            UpdateStudyClubSchema.safeParse({ [field]: value }).success,
            true,
         );
      }
   }
});

test('Study Club endpoints have separate authenticated OpenAPI contracts', () => {
   const paths = generateOpenApiDocument().paths;
   const base = '/api/internal/education/study-clubs';
   for (const operation of [
      paths[base]?.get,
      paths[base]?.post,
      paths[`${base}/{sessionId}`]?.get,
      paths[`${base}/{sessionId}`]?.patch,
   ]) {
      assert.ok(operation);
      assert.deepEqual(operation.security, [{ sessionCookie: [] }]);
      assert.ok(operation.responses['401']);
      assert.ok(operation.responses['403']);
   }
   assert.ok(paths['/api/internal/education/responsi']?.get);
});
