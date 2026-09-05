import assert from 'node:assert/strict';
import test from 'node:test';
import {
   CreateEventSchema,
   RegistrationSettingsSchema,
} from './eventSchema.js';

test('event schedule must end after it starts', () => {
   assert.equal(
      CreateEventSchema.safeParse({
         name: 'Valid Event',
         startsAt: '2026-09-06',
         endsAt: '2026-09-05',
      }).success,
      false,
   );
});

test('registration settings enforce lifecycle and attendance dependencies', () => {
   const settings = {
      isRegistrationOpen: true,
      registrationOpensAt: '2026-09-05',
      registrationClosesAt: '2026-09-06',
      cancellationClosesAt: null,
      capacity: 100,
      paymentCurrency: 'IDR',
      paymentBankName: null,
      paymentAccountNumber: null,
      paymentAccountHolder: null,
      paymentInstructions: null,
      paymentProofTypes: ['image/png'],
      paymentProofMaxBytes: 1024,
      attendanceEnabled: false,
      attendanceCheckoutEnabled: true,
   };
   assert.equal(RegistrationSettingsSchema.safeParse(settings).success, false);
   assert.equal(
      RegistrationSettingsSchema.safeParse({
         ...settings,
         attendanceEnabled: true,
      }).success,
      true,
   );
});
