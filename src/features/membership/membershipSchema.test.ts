import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
   CreateResourceSchema,
   MembershipPositionSchema,
   MembershipResourceSchema,
   MembershipStatusSchema,
   UpdateResourceSchema,
} from './membershipSchema.js';

describe('membership position schemas', () => {
   test('accepts only supported positions', () => {
      for (const position of ['OFFICER', 'STAFF', 'MEMBER']) {
         assert.equal(
            MembershipPositionSchema.safeParse(position).success,
            true,
         );
      }
      assert.equal(
         MembershipPositionSchema.safeParse('CHAIRPERSON').success,
         false,
      );
   });

   test('requires a nullable current position in membership status', () => {
      const status = {
         currentPeriod: null,
         currentPosition: null,
         availablePeriod: null,
         activePeriod: null,
      };

      assert.equal(MembershipStatusSchema.safeParse(status).success, true);
      assert.equal(
         MembershipStatusSchema.safeParse({
            ...status,
            currentPosition: 'STAFF',
         }).success,
         true,
      );
      assert.equal(
         MembershipStatusSchema.safeParse({
            ...status,
            currentPosition: 'CHAIRPERSON',
         }).success,
         false,
      );
   });
});

const resource = {
   title: 'Member handbook',
   description: 'The current member handbook.',
   regionId: null,
};

describe('CreateResourceSchema', () => {
   test('treats an omitted or empty link as null', () => {
      assert.equal(CreateResourceSchema.parse(resource).url, null);
      assert.equal(
         CreateResourceSchema.parse({ ...resource, url: null }).url,
         null,
      );
      assert.equal(
         CreateResourceSchema.parse({ ...resource, url: '' }).url,
         null,
      );
      assert.equal(
         CreateResourceSchema.parse({ ...resource, url: '   ' }).url,
         null,
      );
   });

   test('normalizes schemeless, HTTP, and HTTPS links', () => {
      assert.equal(
         CreateResourceSchema.parse({ ...resource, url: 'youtube.com' }).url,
         'https://youtube.com/',
      );
      assert.equal(
         CreateResourceSchema.parse({
            ...resource,
            url: 'http://example.com/resource',
         }).url,
         'http://example.com/resource',
      );
      assert.equal(
         CreateResourceSchema.parse({
            ...resource,
            url: ' HTTPS://EXAMPLE.COM/resource?member=1#details ',
         }).url,
         'https://example.com/resource?member=1#details',
      );
      assert.equal(
         CreateResourceSchema.parse({
            ...resource,
            url: 'https://example.com/member handbook',
         }).url,
         'https://example.com/member%20handbook',
      );
   });

   test('rejects malformed links and unsupported schemes', () => {
      const rejectedLinks = [
         'javascript:alert(1)',
         'data:text/html,test',
         'file:///tmp/member.txt',
         'ftp://example.com/resource',
         'mailto:member@example.com',
         'https:/example.com',
         'https//example.com',
         'example .com',
         'example.com@evil.com',
         'http://user:password@example.com',
         'https\\evil.com',
      ];

      for (const url of rejectedLinks) {
         assert.equal(
            CreateResourceSchema.safeParse({ ...resource, url }).success,
            false,
            `${url} should be rejected`,
         );
      }
   });
});

describe('UpdateResourceSchema', () => {
   test('preserves an omitted link and clears an explicit empty link', () => {
      assert.deepEqual(UpdateResourceSchema.parse({ title: 'Updated' }), {
         title: 'Updated',
      });
      assert.deepEqual(UpdateResourceSchema.parse({ url: '' }), { url: null });
      assert.deepEqual(UpdateResourceSchema.parse({ url: null }), {
         url: null,
      });
   });

   test('normalizes a supplied link and rejects an empty update', () => {
      assert.deepEqual(
         UpdateResourceSchema.parse({ url: 'youtube.com/watch?v=1' }),
         {
            url: 'https://youtube.com/watch?v=1',
         },
      );
      assert.equal(UpdateResourceSchema.safeParse({}).success, false);
   });
});

describe('MembershipResourceSchema', () => {
   const response = {
      id: 'resource-id',
      periodId: '2026-2027',
      title: 'Member handbook',
      description: 'The current member handbook.',
      position: 0,
      region: null,
   };

   test('accepts HTTP(S) links and null in responses', () => {
      assert.equal(
         MembershipResourceSchema.safeParse({ ...response, url: null }).success,
         true,
      );
      assert.equal(
         MembershipResourceSchema.safeParse({
            ...response,
            url: 'https://example.com/',
         }).success,
         true,
      );
   });

   test('rejects unsafe response links', () => {
      assert.equal(
         MembershipResourceSchema.safeParse({
            ...response,
            url: 'javascript:alert(1)',
         }).success,
         false,
      );
   });
});
