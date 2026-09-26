import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { buildOutlookVerificationUrl } from '@/config/verification.js';

describe('buildOutlookVerificationUrl', () => {
   test('builds initial registration verification URLs', () => {
      assert.equal(
         buildOutlookVerificationUrl(
            'https://registration.himtibinus.or.id',
            'token value',
            'register',
         ),
         'https://registration.himtibinus.or.id/verify-outlook?token=token+value&flow=register',
      );
   });

   test('builds reregistration URLs without duplicate slashes', () => {
      assert.equal(
         buildOutlookVerificationUrl(
            'http://localhost:3000/app/',
            'abc123',
            'reregister',
         ),
         'http://localhost:3000/verify-outlook?token=abc123&flow=reregister',
      );
   });

   test('rejects unsupported frontend URL protocols', () => {
      assert.throws(() =>
         buildOutlookVerificationUrl('file:///tmp/app', 'abc123', 'register'),
      );
   });
});
