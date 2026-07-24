import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { CreateEventSchema, SubEventOrderSchema } from './eventSchema.js';

describe('event hub schemas', () => {
   it('normalizes optional cover image URLs and blank values', () => {
      const base = { name: 'Expo', publicDescription: 'Description' };
      assert.equal(
         CreateEventSchema.parse({ ...base, coverImageUrl: 'example.com/a' })
            .coverImageUrl,
         'https://example.com/a',
      );
      assert.equal(
         CreateEventSchema.parse({ ...base, coverImageUrl: '   ' })
            .coverImageUrl,
         null,
      );
   });

   it('rejects non-HTTP cover image URLs', () => {
      assert.equal(
         CreateEventSchema.safeParse({
            name: 'Expo',
            publicDescription: 'Description',
            coverImageUrl: 'ftp://example.com/a',
         }).success,
         false,
      );
   });

   it('accepts the complete-order request shape only', () => {
      assert.deepEqual(SubEventOrderSchema.parse({ subEventIds: ['a', 'b'] }), {
         subEventIds: ['a', 'b'],
      });
      assert.equal(
         SubEventOrderSchema.safeParse({ subEventIds: ['a'], extra: true })
            .success,
         false,
      );
   });
});
