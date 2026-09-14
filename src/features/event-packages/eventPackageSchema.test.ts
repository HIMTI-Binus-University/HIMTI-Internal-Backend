import assert from 'node:assert/strict';
import test from 'node:test';
import { CreateEventPackageSchema } from './eventPackageSchema.js';

test('package requires positive seats, nonnegative price, and ordered sales dates', () => {
   assert.equal(
      CreateEventPackageSchema.safeParse({
         name: 'Team',
         seatCount: 0,
         priceMinor: -1,
      }).success,
      false,
   );
   assert.equal(
      CreateEventPackageSchema.safeParse({
         name: 'Team',
         seatCount: 4,
         priceMinor: 100,
         salesStartAt: '2026-09-05',
         salesEndAt: '2026-09-04',
      }).success,
      false,
   );
   assert.equal(
      CreateEventPackageSchema.safeParse({
         name: 'Team',
         seatCount: 4,
         priceMinor: '180000',
      }).success,
      true,
   );
});
