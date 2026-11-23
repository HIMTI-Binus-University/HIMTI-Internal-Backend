import assert from 'node:assert/strict';
import test from 'node:test';
import { CreateVideoSchema, getYoutubeVideoId, UpdateVideoSchema, VideoListQuerySchema } from './videoSchema.js';

test('accepts real YouTube watch, short, embed and shorts links', () => {
   const expected = 'dQw4w9WgXcQ';
   for (const url of [
      `https://www.youtube.com/watch?v=${expected}&t=42`,
      `https://youtube.com/watch?v=${expected}`,
      `https://m.youtube.com/watch?v=${expected}`,
      `https://youtu.be/${expected}?t=5`,
      `https://www.youtube.com/embed/${expected}`,
      `https://youtube.com/shorts/${expected}`,
   ]) assert.equal(getYoutubeVideoId(url), expected, url);
});

test('rejects URL spoofing, malformed IDs, conflicting watch IDs, and unsupported hosts or paths', () => {
   for (const url of [
      'https://youtube.com.evil.example/watch?v=dQw4w9WgXcQ',
      'https://youtube.com@evil.example/watch?v=dQw4w9WgXcQ',
      'https://user@youtube.com/watch?v=dQw4w9WgXcQ',
      'https://www.youtube.com:8443/watch?v=dQw4w9WgXcQ',
      'javascript:alert(1)',
      'https://youtu.be/short',
      'https://youtu.be/dQw4w9WgXcQ/extra',
      'https://youtube.com/channel/dQw4w9WgXcQ',
      'https://youtube.com/watch?v=dQw4w9WgXcQ&v=other',
      'https://youtube.com/watch?v=dQw4w9WgXc!',
   ]) assert.equal(getYoutubeVideoId(url), null, url);
});

test('a video requires a session and valid URL, starts as draft, and does not accept summary relations', () => {
   const input = { title: '  Recording  ', sessionId: 'session-1', youtubeUrl: 'https://youtu.be/dQw4w9WgXcQ' };
   assert.equal(CreateVideoSchema.parse(input).status, 'DRAFT');
   assert.equal(CreateVideoSchema.parse(input).title, 'Recording');
   assert.equal(CreateVideoSchema.safeParse({ ...input, sessionId: '' }).success, false);
   assert.equal(CreateVideoSchema.safeParse({ ...input, sessionId: undefined }).success, false);
   assert.equal(CreateVideoSchema.safeParse({ ...input, responsiId: 'summary-1' }).success, false);
   assert.equal(CreateVideoSchema.safeParse({ ...input, courseId: 'course-1' }).success, false);
   assert.equal(CreateVideoSchema.safeParse({ ...input, status: 'PUBLISHED' }).success, false);
   assert.equal(UpdateVideoSchema.safeParse({ status: 'PUBLISHED' }).success, true);
   assert.equal(UpdateVideoSchema.safeParse({}).success, false);
});

test('list pagination is bounded and supports session-derived course filtering', () => {
   const query = VideoListQuerySchema.parse({ page: '2', limit: '10', courseId: 'course-1', status: 'PUBLISHED' });
   assert.deepEqual(query, { page: 2, limit: 10, courseId: 'course-1', status: 'PUBLISHED' });
   assert.equal(VideoListQuerySchema.safeParse({ limit: '101' }).success, false);
   assert.equal(VideoListQuerySchema.safeParse({ page: '0' }).success, false);
});
