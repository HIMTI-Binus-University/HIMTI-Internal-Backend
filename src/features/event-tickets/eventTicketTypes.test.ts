import assert from 'node:assert/strict';
import test from 'node:test';
import {
   createTicketCredential,
   decryptTicketCredential,
   generateTicketCredential,
   hashTicketCredential,
   normalizeTicketCredential,
   createStoredTicketCredential,
} from './eventTicketTypes.js';

test('ticket credentials have at least 128 bits and normalize presentation separators', () => {
   const credential = generateTicketCredential();
   const normalized = normalizeTicketCredential(credential);
   assert.match(
      credential,
      /^[2-9A-HJ-NP-Z]{5}(?:-[2-9A-HJ-NP-Z]{5}){4}-[2-9A-HJ-NP-Z]$/,
   );
   assert.equal(normalized.length, 26);
   assert.equal(
      hashTicketCredential(credential),
      hashTicketCredential(credential.toLowerCase().replaceAll('-', ' ')),
   );
});

test('ticket credential recovery is authenticated and stores no readable credential', () => {
   process.env.NODE_ENV = 'test';
   process.env.BETTER_AUTH_SECRET =
      'test-only-ticket-secret-with-at-least-32-bytes';
   const created = createTicketCredential();
   assert.equal(
      decryptTicketCredential(created.credentialEncrypted),
      created.credential,
   );
   assert.equal(created.tokenHash, hashTicketCredential(created.credential));
   assert.ok(!created.credentialEncrypted.includes(created.credential));
   const parts = created.credentialEncrypted.split('.');
   const ciphertext = Buffer.from(parts[3]!, 'base64url');
   ciphertext[0] ^= 1;
   parts[3] = ciphertext.toString('base64url');
   const tampered = parts.join('.');
   assert.throws(() => decryptTicketCredential(tampered));
});

test('database ticket credentials omit plaintext', () => {
   const stored = createStoredTicketCredential();
   assert.deepEqual(Object.keys(stored).sort(), [
      'credentialEncrypted',
      'tokenHash',
   ]);
});
