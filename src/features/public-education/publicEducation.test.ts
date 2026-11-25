import assert from 'node:assert/strict';
import test from 'node:test';
import express from 'express';
import { prisma } from '@/config/prisma.js';
import router from './publicEducationRoutes.js';
import { publicDocument } from './publicEducationService.js';

test('Tiptap converts stored Markdown without exposing unsafe URLs or raw HTML nodes', () => {
   const doc = publicDocument(
      '# Section\n\n**Bold** $x^2$ [safe](https://example.org) [bad](javascript:alert) [private](https://u:p@example.org) [signed](https://example.org/?token=secret) [local](https://127.0.0.1/)\n\n' +
         '![Diagram](https://example.org/diagram.png)\n\n![Unsafe](http://example.org/diagram.png)\n\n' +
         '| A | B |\n|---|---|\n| 1 | 2 |\n\n```python\nprint(1)\n```\n\n<b>text</b>',
   );
   const json = JSON.stringify(doc);
   for (const type of [
      'heading',
      'bold',
      'inlineMath',
      'link',
      'image',
      'table',
      'codeBlock',
   ])
      assert.ok(json.includes(`"type":"${type}"`), type);
   assert.match(json, /"level":2/);
   assert.doesNotMatch(
      json,
      /javascript:|https:\/\/u:p|http:\/\/example|token=secret|127\.0\.0\.1|"type":"html"/,
   );
   assert.deepEqual(publicDocument(''), { type: 'doc', content: [] });
   assert.throws(() => publicDocument('a'.repeat(256 * 1024 + 1)));
   assert.throws(() => publicDocument(`$${'a'.repeat(2049)}$`));
});

test(
   'public endpoints use the DB and never return drafts, private sessions or internal fields',
   {
      skip: process.env.RUN_PUBLIC_EDUCATION_DB_TESTS !== 'true',
   },
   async () => {
      const key = `public-test-${crypto.randomUUID().slice(0, 12)}`;
      const app = express();
      app.use('/api/public', router);
      const server = app.listen(0, '127.0.0.1');
      await new Promise<void>((resolve) => server.once('listening', resolve));
      const address = server.address();
      assert.ok(address && typeof address !== 'string');
      const base =
         process.env.PUBLIC_EDUCATION_TEST_URL ??
         `http://127.0.0.1:${address.port}/api/public`;
      try {
         await prisma.course.createMany({
            data: [
               { id: key, code: key, name: key, semester: 2 },
               {
                  id: `${key}-hidden`,
                  code: `${key}-hidden`,
                  name: `${key}-hidden`,
               },
            ],
         });
         const content = '## Markdown\n\n**Never stored as JSON.**';
         const summary = {
            title: 'Summary',
            content,
            pic: 'Private PIC',
            academicPeriod: '2026/2027',
            examType: 'Mid Exam',
            status: 'PUBLISHED' as const,
         };
         await prisma.responsi.createMany({
            data: [
               { ...summary, id: key, courseId: key },
               {
                  ...summary,
                  id: `${key}-draft`,
                  courseId: key,
                  status: 'DRAFT',
               },
               { ...summary, id: `${key}-hidden`, courseId: `${key}-hidden` },
            ],
         });
         const session = {
            title: 'Session',
            courseId: key,
            type: 'Responsi',
            startsAt: new Date('2026-11-23T19:00:00Z'),
            endsAt: new Date('2026-11-23T20:00:00Z'),
            createdBy: 'Private user',
            updatedBy: 'Private user',
            meetingUrl: 'https://example.org/private',
            registrationUrl: 'https://example.org/registrants',
         };
         await prisma.studyClubSession.createMany({
            data: [
               { ...session, id: key, isPublic: true },
               { ...session, id: `${key}-private` },
               { ...session, id: `${key}-demo`, isPublic: true, isDemo: true },
            ],
         });
         await prisma.educationVideo.create({
            data: {
               sessionId: key,
               title: 'Recording',
               youtubeUrl: 'https://youtu.be/dQw4w9WgXcQ',
               youtubeVideoId: 'dQw4w9WgXcQ',
               status: 'PUBLISHED',
            },
         });
         const response = await fetch(`${base}/catalog`);
         assert.equal(response.status, 200);
         assert.equal(response.headers.get('cache-control'), 'no-store');
         const { courses, summaries, events } = await response.json();
         assert.equal(
            courses.find((course: { id: string }) => course.id === key)
               .semester,
            2,
         );
         const visibleSummaries = summaries.filter((row: { id: string }) =>
            row.id.startsWith(key),
         );
         assert.deepEqual(visibleSummaries, [
            {
               id: key,
               title: 'Summary',
               courseId: key,
               academicPeriod: '2026/2027',
               semester: 2,
               examType: 'Mid Exam',
               contributors: [],
            },
         ]);
         assert.deepEqual(
            events.filter((row: { id: string }) => row.id.startsWith(key)),
            [
               {
                  id: key,
                  title: 'Session',
                  courseId: key,
                  type: 'Responsi',
                  startsAt: '2026-11-23T19:00:00.000Z',
                  endsAt: '2026-11-23T20:00:00.000Z',
                  location: '',
                  description: '',
                  recordingUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
               },
            ],
         );
         const detail = await fetch(`${base}/summaries/${key}`);
         assert.equal(detail.status, 200);
         assert.deepEqual(await detail.json(), {
            ...visibleSummaries[0],
            content: publicDocument(content),
         });
         assert.equal((await fetch(`${base}/summaries/bad.id`)).status, 400);
         await prisma.responsi.update({
            where: { id: key },
            data: { status: 'ARCHIVED' },
         });
         for (const id of [
            key,
            `${key}-draft`,
            `${key}-hidden`,
            `${key}-missing`,
         ]) {
            const result = await fetch(`${base}/summaries/${id}`);
            assert.equal(result.status, 404);
            assert.deepEqual(await result.json(), {
               error: { code: 'NOT_FOUND', message: 'Not found' },
            });
         }
         assert.equal(
            (await prisma.responsi.findUniqueOrThrow({ where: { id: key } }))
               .content,
            content,
         );
      } finally {
         server.close();
         await prisma.educationVideo.deleteMany({ where: { sessionId: key } });
         await prisma.studyClubSession.deleteMany({ where: { courseId: key } });
         await prisma.course.deleteMany({
            where: { id: { in: [key, `${key}-hidden`] } },
         });
         await prisma.$disconnect();
      }
   },
);
