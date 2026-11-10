import assert from 'node:assert/strict';
import test from 'node:test';
import { createVideoService, videoService } from './videoService.js';
import type { videoRepository } from './videoRepository.js';

const recording = {
   title: 'Recording',
   sessionId: 'session-1',
   youtubeUrl: 'https://youtu.be/dQw4w9WgXcQ',
   status: 'DRAFT' as const,
};

test('video creation fails safely until session integration is configured', async () => {
   await assert.rejects(videoService.create(recording), { code: 'SESSION_INTEGRATION_UNAVAILABLE', statusCode: 503 });
});

test('creating a video rejects an unavailable session before saving', async () => {
   let saved = false;
   const repo = {
      findSession: async () => null,
      create: async () => { saved = true; },
   } as unknown as typeof videoRepository;
   await assert.rejects(createVideoService(repo).create(recording), /Education session not found/);
   assert.equal(saved, false);
});

test('creating a video saves the YouTube ID for its selected session', async () => {
   let saved: unknown;
   const repo = {
      findSession: async () => ({ id: 'session-1' }),
      create: async (data: unknown) => { saved = data; return data; },
   } as unknown as typeof videoRepository;
   await createVideoService(repo).create(recording);
   assert.deepEqual(saved, { ...recording, youtubeVideoId: 'dQw4w9WgXcQ' });
});

test('changing a video to an unavailable session never updates it', async () => {
   let updated = false;
   const repo = {
      find: async () => ({ id: 'video-1' }),
      findSession: async () => null,
      update: async () => { updated = true; },
   } as unknown as typeof videoRepository;
   await assert.rejects(createVideoService(repo).update('video-1', { sessionId: 'missing' }), /Education session not found/);
   assert.equal(updated, false);
});

test('video listing filters course through the session and paginates', async () => {
   let received: unknown;
   const repo = {
      findSessionIdsByCourse: async () => ['session-1'],
      list: async (where: unknown, skip: number, take: number) => { received = { where, skip, take }; return []; },
      count: async () => 11,
   } as unknown as typeof videoRepository;
   const result = await createVideoService(repo).list({ courseId: 'course-1', status: 'PUBLISHED', page: 2, limit: 10 });
   assert.deepEqual(received, { where: { sessionId: { in: ['session-1'] }, status: 'PUBLISHED' }, skip: 10, take: 10 });
   assert.deepEqual(result.pagination, { page: 2, limit: 10, total: 11, totalPages: 2 });
});
