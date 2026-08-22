import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { registrationReviewCapabilities } from './eventRegistrationService.js';

describe('registration review capabilities', () => {
   it('only exposes transitions accepted by reviewMany', () => {
      assert.deepEqual(registrationReviewCapabilities('PENDING_APPROVAL'), [
         'approve',
         'request-correction',
         'reject',
         'admin-cancel',
      ]);
      assert.deepEqual(registrationReviewCapabilities('SUBMITTED'), []);
      assert.deepEqual(registrationReviewCapabilities('APPROVED'), [
         'admin-cancel',
      ]);
   });
});
