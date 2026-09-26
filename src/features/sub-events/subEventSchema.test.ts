import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
   CreateSubEventSchema,
   UpdateSubEventSchema,
} from './subEventSchema.js';

const requiredSubEvent = {
   eventId: 'event-id',
   name: 'Expo Hall',
   date: '2026-07-23T10:00:00.000Z',
   type: 'MAIN_EVENT' as const,
};

describe('sub-event hub schemas', () => {
   it('normalizes URL inputs and defaults visibility', () => {
      const value = CreateSubEventSchema.parse({
         ...requiredSubEvent,
         locationUrl: 'maps.example.com/hall',
         posterUrl: '',
         destinationUrl: ' HTTPS://EXAMPLE.COM/register ',
      });
      assert.equal(value.locationUrl, 'https://maps.example.com/hall');
      assert.equal(value.posterUrl, null);
      assert.equal(value.destinationUrl, 'https://example.com/register');
      assert.equal(value.visibility, 'PUBLIC');
   });

   it('preserves omitted update URLs and nulls blank URLs', () => {
      assert.deepEqual(UpdateSubEventSchema.parse({ name: 'Updated' }), {
         name: 'Updated',
      });
      assert.deepEqual(UpdateSubEventSchema.parse({ destinationUrl: ' ' }), {
         destinationUrl: null,
      });
   });

   it('rejects non-HTTP URL inputs', () => {
      assert.equal(
         CreateSubEventSchema.safeParse({
            ...requiredSubEvent,
            posterUrl: 'javascript:alert(1)',
         }).success,
         false,
      );
   });
});
