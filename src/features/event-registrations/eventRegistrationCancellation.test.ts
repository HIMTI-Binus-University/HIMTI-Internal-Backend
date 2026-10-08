import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const source = readFileSync(
   new URL('./eventRegistrationRepository.ts', import.meta.url),
   'utf8',
);

test('individual cancellation accepts members locked for pending payment', () => {
   const cancellation = source.slice(source.indexOf('async cancel('));

   assert.match(cancellation, /seatCount: 1/);
   assert.match(cancellation, /status: \{ in: \['ACTIVE', 'LOCKED'\] \}/);
   assert.match(
      cancellation,
      /\['ASSEMBLING', 'PENDING_PAYMENT'\]\.includes\(order\.status\)/,
   );
});
