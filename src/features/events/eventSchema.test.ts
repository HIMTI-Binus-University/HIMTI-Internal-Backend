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
         isPaid: false,
         startsAt: '2026-09-06',
         endsAt: '2026-09-05',
      }).success,
      false,
   );
});

test('event pricing requires a positive paid price and keeps free tickets free', () => {
   const free = CreateEventSchema.parse({ name: 'Free Event', isPaid: false });
   assert.equal(free.individualTicketPriceMinor, undefined);
   assert.equal(free.individualTicketCurrency, 'IDR');

   const paid = CreateEventSchema.parse({
      name: 'Paid Event',
      isPaid: true,
      individualTicketPriceMinor: '150000',
   });
   assert.equal(paid.individualTicketPriceMinor, 150000n);
   assert.equal(
      CreateEventSchema.safeParse({ name: 'Paid Event', isPaid: true }).success,
      false,
   );
   assert.equal(
      CreateEventSchema.safeParse({
         name: 'Free Event',
         isPaid: false,
         individualTicketPriceMinor: '1',
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

test('payment proof limit is not accepted from registration settings requests', () => {
   const settings = {
      isRegistrationOpen: false,
      registrationOpensAt: null,
      registrationClosesAt: null,
      cancellationClosesAt: null,
      capacity: null,
      paymentCurrency: 'IDR',
      paymentBankName: null,
      paymentAccountNumber: null,
      paymentAccountHolder: null,
      paymentInstructions: null,
      attendanceEnabled: false,
      attendanceCheckoutEnabled: false,
   };
   assert.equal(RegistrationSettingsSchema.safeParse(settings).success, true);
   assert.equal(
      RegistrationSettingsSchema.safeParse({
         ...settings,
         paymentProofMaxBytes: 1_572_864,
      }).success,
      false,
   );
   assert.equal(
      RegistrationSettingsSchema.safeParse({
         ...settings,
         paymentProofTypes: ['image/png'],
      }).success,
      false,
   );
});
