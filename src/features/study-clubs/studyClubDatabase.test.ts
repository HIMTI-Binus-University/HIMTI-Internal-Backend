import assert from 'node:assert/strict';
import test from 'node:test';
import express from 'express';
import { auth } from '@/utils/auth.js';
import { globalErrorHandler } from '@/middleware/errorMiddleware.js';
import studyClubRoutes from './studyClubRoutes.js';
import { prisma } from '@/config/prisma.js';
import { studyClubService as service } from './studyClubService.js';
import {
   CreateStudyClubSchema,
   StudyClubListQuerySchema,
} from './studyClubSchema.js';

test(
   'Study Club persists, filters, paginates and validates merged updates',
   {
      skip: process.env.RUN_STUDY_CLUB_DB_TESTS !== 'true',
   },
   async () => {
      const course = await prisma.course.findFirst({
         where: { status: 'ACTIVE' },
      });

      await test(
         'Study Club HTTP routes enforce auth and permissions before writes',
         {
            skip: process.env.RUN_STUDY_CLUB_DB_TESTS !== 'true',
         },
         async () => {
            const app = express();
            app.use(express.json());
            app.use('/study-clubs', studyClubRoutes);
            app.use(globalErrorHandler);
            const server = app.listen(0, '127.0.0.1');
            await new Promise<void>((resolve) =>
               server.once('listening', resolve),
            );
            const address = server.address();
            assert.ok(address && typeof address !== 'string');
            const base = `http://127.0.0.1:${address.port}/study-clubs`;
            const original = auth.api.getSession;
            try {
               for (const [method, path] of [
                  ['GET', ''],
                  ['POST', ''],
                  ['GET', '/missing'],
                  ['PATCH', '/missing'],
               ]) {
                  assert.equal(
                     (await fetch(`${base}${path}`, { method })).status,
                     401,
                  );
               }
               Object.assign(auth.api, {
                  getSession: async () => ({
                     user: {
                        id: 'nonexistent-study-club-test-user',
                        status: 'ACTIVE',
                     },
                     session: {},
                  }),
               });
               assert.equal((await fetch(base)).status, 403);
               assert.equal(
                  (
                     await fetch(base, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: '{}',
                     })
                  ).status,
                  403,
               );
               const actor = await prisma.user.findUniqueOrThrow({
                  where: { email: 'system@himti.internal' },
               });
               Object.assign(auth.api, {
                  getSession: async () => ({
                     user: { id: actor.id, status: 'ACTIVE' },
                     session: {},
                  }),
               });
               assert.equal((await fetch(base)).status, 200);
               assert.equal(
                  (
                     await fetch(base, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: '{}',
                     })
                  ).status,
                  400,
               );
               assert.equal((await fetch(`${base}/missing`)).status, 404);
            } finally {
               Object.assign(auth.api, { getSession: original });
               await new Promise<void>((resolve, reject) =>
                  server.close((error) => (error ? reject(error) : resolve())),
               );
               await prisma.$disconnect();
            }
         },
      );
      assert.ok(course, 'Seed an active course group before running this test');
      let id: string | undefined;
      try {
         const payload = CreateStudyClubSchema.parse({
            title: `Study Club DB check ${crypto.randomUUID()}`,
            type: 'Study Club',
            courseId: course.id,
            description: '',
            startsAt: '2099-11-04T03:00:00Z',
            endsAt: '2099-11-04T05:00:00Z',
            location: 'Test room',
            meetingUrl: '',
            registrationUrl: '',
            capacity: 20,
         });
         const created = await service.create(payload, 'local-test');
         id = created.id;
         assert.equal(created.isDemo, false);
         assert.equal((await service.get(id)).title, payload.title);
         const listed = await service.list(
            StudyClubListQuerySchema.parse({
               search: payload.title,
               course: course.name,
               limit: 1,
            }),
         );
         assert.equal(listed.pagination.total, 1);
         assert.equal(listed.data[0]?.id, id);
         await assert.rejects(
            service.update(
               id,
               { startsAt: '2100-01-01T00:00:00Z' },
               'local-test',
            ),
         );
         await assert.rejects(
            service.update(id, { location: '' }, 'local-test'),
         );
         await assert.rejects(
            service.update(id, { courseId: 'does-not-exist' }, 'local-test'),
         );
         const updated = await service.update(
            id,
            { capacity: null, title: `${payload.title} updated` },
            'local-test',
         );
         assert.equal(updated.capacity, null);
         assert.equal(updated.startsAt, created.startsAt);
         assert.equal(
            (await prisma.studyClubSession.findUniqueOrThrow({ where: { id } }))
               .updatedBy,
            'local-test',
         );
         assert.equal(
            (
               await service.list(
                  StudyClubListQuerySchema.parse({
                     search: payload.title,
                     schedule: 'past',
                  }),
               )
            ).pagination.total,
            0,
         );
         await assert.rejects(
            prisma.studyClubSession.update({
               where: { id },
               data: { capacity: -1 },
            }),
         );
      } finally {
         if (id) await prisma.studyClubSession.delete({ where: { id } });
         await prisma.$disconnect();
      }
   },
);
