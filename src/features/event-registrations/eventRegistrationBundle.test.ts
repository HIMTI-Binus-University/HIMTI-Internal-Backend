import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
   eventRegistrationService,
   decryptBundleCode,
   encryptBundleCode,
   generateBundleCode,
   hashBundleCode,
   equalBundleCodeHashes,
   normalizeBundleCode,
} from './eventRegistrationService.js';
import { eventRegistrationRepository as repo } from './eventRegistrationRepository.js';

test('Bundle Codes are high entropy, presentation-normalized, and HMAC hashed', () => {
   const secret = '0123456789abcdef0123456789abcdef';
   const code = generateBundleCode();
   assert.match(code, /^[2-9A-HJ-NP-Z]{4}(?:-[2-9A-HJ-NP-Z]{4}){2}$/);
   assert.equal(
      normalizeBundleCode(code.toLowerCase()),
      code.replaceAll('-', ''),
   );
   assert.equal(
      hashBundleCode(code, secret),
      hashBundleCode(code.toLowerCase(), secret),
   );
   assert.equal(hashBundleCode(code, secret).length, 64);
   assert.notEqual(hashBundleCode(code, secret), normalizeBundleCode(code));
   assert.equal(
      equalBundleCodeHashes(
         hashBundleCode(code, secret),
         hashBundleCode(code.toLowerCase(), secret),
      ),
      true,
   );
   assert.equal(
      equalBundleCodeHashes(hashBundleCode(code, secret), '00'.repeat(32)),
      false,
   );
   assert.notEqual(generateBundleCode(), code);
});

test('Bundle Codes use authenticated randomized encryption at rest', () => {
   const secret = '0123456789abcdef0123456789abcdef';
   const code = 'AAAA-BBBB-CCCC-DDDD';
   const first = encryptBundleCode(code, secret);
   const second = encryptBundleCode(code, secret);
   assert.notEqual(first, second);
   assert.equal(decryptBundleCode(first, secret), code);
   assert.doesNotMatch(first, /AAAA|BBBB|CCCC|DDDD/);
   const parts = first.split('.');
   const ciphertext = Buffer.from(parts[3]!, 'base64url');
   ciphertext[0] ^= 1;
   parts[3] = ciphertext.toString('base64url');
   assert.throws(() => decryptBundleCode(parts.join('.'), secret));
});

test('idempotent Bundle Code derivation is stable without exposing its seed', () => {
   process.env.BUNDLE_CODE_HMAC_SECRET = '0123456789abcdef0123456789abcdef';
   assert.equal(
      generateBundleCode('same request'),
      generateBundleCode('same request'),
   );
   assert.notEqual(
      generateBundleCode('other request'),
      generateBundleCode('same request'),
   );
   assert.doesNotMatch(generateBundleCode('same request'), /same request/i);
});

test('Bundle joins and finalization retain database race guards', async () => {
   const [repository, migration, encryptedCodeMigration] = await Promise.all([
      readFile(
         new URL('./eventRegistrationRepository.ts', import.meta.url),
         'utf8',
      ),
      readFile(
         new URL(
            '../../../prisma/migrations/20260905000000_replace_registration_event_foundation/migration.sql',
            import.meta.url,
         ),
         'utf8',
      ),
      readFile(
         new URL(
            '../../../prisma/migrations/20260908120000_store_encrypted_bundle_code/migration.sql',
            import.meta.url,
         ),
         'utf8',
      ),
   ]);
   assert.match(
      repository,
      /SELECT id FROM registration_orders WHERE id = \$\{candidate\.id\} FOR UPDATE/,
   );
   assert.match(repository, /order\.members\.length !== order\.seatCount/);
   assert.match(
      repository,
      /select: \{ id: true, eventId: true, status: true \}/,
   );
   assert.match(
      repository,
      /members: \{[\s\S]+some: \{ userId, status: \{ in: \['ACTIVE', 'LOCKED'\] \} \}/,
   );
   assert.doesNotMatch(
      repository.slice(
         repository.indexOf('async list(userId'),
         repository.indexOf('async replaceAnswers'),
      ),
      /orderInclude|bundleCodeHash|payment|submissions/,
   );
   assert.match(
      repository,
      /status: \{ in: \['ACTIVE', 'LOCKED'\] \}[\s\S]+return \{ result: 'JOINED'/,
   );
   assert.match(
      repository,
      /bundleCodeHash,[\s\S]+members: \{ some: \{ userId \} \}[\s\S]+result: 'CREATED'/,
   );
   assert.match(
      repository,
      /async createBundle[\s\S]+registrationOrder\.create[\s\S]+bundleCodeHash,[\s\S]+bundleCodeEncrypted/,
   );
   assert.match(
      repository,
      /async replaceBundleCode[\s\S]+data: \{[\s\S]+bundleCodeHash,[\s\S]+bundleCodeEncrypted,[\s\S]+revision:/,
   );
   assert.match(
      repository,
      /async replaceBundleCode[\s\S]+seatCount: \{ gt: 1 \}[\s\S]+status: \{ in: \['ACTIVE', 'LOCKED'\] \}/,
   );
   assert.doesNotMatch(
      repository.slice(
         repository.indexOf('internalList(eventId'),
         repository.indexOf('async replaceAnswers'),
      ),
      /bundleCodeEncrypted/,
   );
   assert.match(
      repository,
      /position:[\s\S]+Math\.max\(\.\.\.order\.members\.map/,
   );
   assert.match(repository, /quantity: order\.seatCount/);
   assert.match(repository, /TransactionIsolationLevel\.Serializable/);
   assert.match(
      migration,
      /registration_members_one_active_per_event_user[\s\S]+WHERE "status" IN \('ACTIVE', 'LOCKED'\)/,
   );
   assert.match(
      encryptedCodeMigration,
      /ADD COLUMN "bundleCodeEncrypted" TEXT/,
   );
   assert.doesNotMatch(encryptedCodeMigration, /NOT NULL|UPDATE|DROP|DELETE/i);
});

test('Bundle join does not reveal a valid code when the account is in another order', async (t) => {
   t.mock.method(repo, 'profile', async () => ({
      name: 'Member',
      email: 'member@example.com',
      outlookEmail: null,
      outlookEmailVerified: false,
      phoneNumber: '08123456789',
      nim: null,
      memberType: 'OTHER',
      institutionType: 'NON_BINUS',
      universityName: 'University',
      studyProgramName: 'Program',
      department: null,
      affiliation: null,
      registrationCompletedAt: new Date(),
      university: null,
      studyProgram: null,
      region: null,
   }));
   t.mock.method(repo, 'joinBundle', async () => ({ result: 'DUPLICATE' }));
   await assert.rejects(
      eventRegistrationService.joinBundle(
         'event',
         { ticketPackageId: 'package', bundleCode: 'AAAA-BBBB' },
         'user',
      ),
      (error: unknown) =>
         typeof error === 'object' &&
         error !== null &&
         'statusCode' in error &&
         error.statusCode === 404 &&
         'code' in error &&
         error.code === 'BUNDLE_UNAVAILABLE',
   );
});

test('sold-out reconciliation does not deny an active member read access', async (t) => {
   const order = {
      id: 'bundle',
      status: 'ASSEMBLING',
      members: [],
   };
   t.mock.method(repo, 'owned', async () => order as never);
   t.mock.method(repo, 'profile', async () => null);
   t.mock.method(repo, 'finalize', async () => ({ result: 'SOLD_OUT' }));
   const result = (await eventRegistrationService.get('bundle', 'member')) as {
      status: string;
   };
   assert.equal(result.status, 'ASSEMBLING');
});

test('participant detail decrypts current Bundle Code and legacy Bundles return null', async (t) => {
   const secret = '0123456789abcdef0123456789abcdef';
   process.env.BUNDLE_CODE_HMAC_SECRET = secret;
   const order = {
      id: 'bundle',
      status: 'PENDING_PAYMENT',
      seatCount: 2,
      bundleCodeHash: hashBundleCode('AAAA-BBBB', secret),
      bundleCodeEncrypted: encryptBundleCode('AAAA-BBBB', secret),
      members: [],
   };
   t.mock.method(repo, 'owned', async () => order as never);
   t.mock.method(repo, 'profile', async () => null);
   const current = (await eventRegistrationService.get('bundle', 'member')) as {
      bundleCode: string | null;
      bundleCodeHash?: string;
      bundleCodeEncrypted?: string;
   };
   assert.equal(current.bundleCode, 'AAAA-BBBB');
   assert.equal(current.bundleCodeHash, undefined);
   assert.equal(current.bundleCodeEncrypted, undefined);
   order.bundleCodeEncrypted = null as never;
   const legacy = (await eventRegistrationService.get('bundle', 'member')) as {
      bundleCode: string | null;
   };
   assert.equal(legacy.bundleCode, null);
});
