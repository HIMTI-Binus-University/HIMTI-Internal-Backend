import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const source = (name: string) =>
   readFileSync(fileURLToPath(new URL(name, import.meta.url)), 'utf8');
describe('Phase 9 ticket hardening', () => {
   it('separates read-only resolve from explicit check-in commands', () => {
      const routes = source('./eventTicketRoutes.ts');
      assert.match(routes, /tickets\/resolve/);
      assert.match(routes, /tickets\/check-in/);
      assert.match(routes, /tickets\/manual-check-in/);
      const service = source('./eventTicketService.ts');
      const resolveStart = service.indexOf('async resolve');
      const resolveEnd = service.indexOf('private mapResolved', resolveStart);
      assert.doesNotMatch(
         service.slice(resolveStart, resolveEnd),
         /\.checkIn\(/,
      );
   });
   it('applies event object scope and scoped attendance mutations', () => {
      const service = source('./eventTicketService.ts');
      assert.match(service, /assertEventCommitteeMemberOrAdmin/);
      const routes = source('./eventTicketRoutes.ts');
      assert.match(
         routes,
         /sub-events\/:subEventId\/attendance\/:attendanceId\/checkout/,
      );
      assert.match(
         routes,
         /sub-events\/:subEventId\/attendance\/:attendanceId\/void/,
      );
   });
   it('only considers exact attendee blocking assignments', () => {
      const repository = source('./eventTicketRepository.ts');
      assert.match(repository, /audience: 'EACH_ATTENDEE'/);
      assert.match(repository, /blocksCheckIn: true/);
      assert.doesNotMatch(repository, /audience: 'BUYER'/);
      assert.doesNotMatch(repository, /audience: 'ALL_ORDER_MEMBERS'/);
   });
   it('uses AAD, strict key decoding, CAS, and an active attendance guard', () => {
      const crypto = source('./ticketCredentialCrypto.ts');
      assert.match(crypto, /setAAD/);
      assert.match(crypto, /toString\('base64'\) === value/);
      const repository = source('./eventTicketRepository.ts');
      assert.match(repository, /updateMany/);
      assert.match(repository, /revision/);
      const migration = readFileSync(
         fileURLToPath(
            new URL(
               '../../../prisma/migrations/20260822110000_phase9_attendance_hardening/migration.sql',
               import.meta.url,
            ),
         ),
         'utf8',
      );
      assert.match(migration, /UNIQUE INDEX/);
      assert.match(migration, /WHERE "voidedAt" IS NULL/);
   });
   it('returns authoritative participant QR eligibility without answers', () => {
      const repository = source('./eventTicketRepository.ts');
      const service = source('./eventTicketService.ts');
      const docs = source('./eventTicketDocs.ts');
      assert.match(service, /BLOCKED_BY_FORMS/);
      assert.match(service, /NOT_PRESENTABLE/);
      assert.match(service, /canPresentQr/);
      assert.match(service, /Ticket is not available for presentation/);
      assert.match(repository, /registrationOrderId: true/);
      assert.match(repository, /form: \{ select: \{ name: true \} \}/);
      assert.doesNotMatch(repository, /answers:\s*\{\s*(?:select|include)/);
      assert.match(docs, /checkInEligibility/);
      assert.match(docs, /assignmentId/);
   });
});
