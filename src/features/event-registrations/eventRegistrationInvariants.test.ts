import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
   activeRegistrationStatuses,
   capacityConsumingStatuses,
   isTerminalRegistrationStatus,
   validateFreshSubmission,
} from './eventRegistrationTypes.js';

const repositorySource = readFileSync(
   fileURLToPath(new URL('./eventRegistrationRepository.ts', import.meta.url)),
   'utf8',
);
const routesSource = readFileSync(
   fileURLToPath(new URL('./eventRegistrationRoutes.ts', import.meta.url)),
   'utf8',
);
const eventRepositorySource = readFileSync(
   fileURLToPath(new URL('../events/eventRepository.ts', import.meta.url)),
   'utf8',
);
const subEventRepositorySource = readFileSync(
   fileURLToPath(
      new URL('../sub-events/subEventRepository.ts', import.meta.url),
   ),
   'utf8',
);
const serviceSource = readFileSync(
   fileURLToPath(new URL('./eventRegistrationService.ts', import.meta.url)),
   'utf8',
);

describe('free registration source invariants', () => {
   it('counts only submitted approval lifecycle states as occupied capacity', () => {
      assert.deepEqual(capacityConsumingStatuses, [
         'SUBMITTED',
         'PENDING_APPROVAL',
         'APPROVED',
      ]);
      assert.equal(
         activeRegistrationStatuses.includes('DRAFT' as never),
         false,
      );
   });

   it('locks the sub-event and uses serializable mutations', () => {
      assert.match(repositorySource, /FOR UPDATE/);
      assert.match(repositorySource, /TransactionIsolationLevel\.Serializable/);
      assert.match(repositorySource, /status: 'CONSUMED'/);
   });

   it('protects every mutation and private read', () => {
      assert.match(routesSource, /registrations',\s*requireAuth/);
      assert.match(routesSource, /event-registrations', requireAuth/);
      assert.match(routesSource, /response',\s*requireAuth/);
      assert.match(routesSource, /submit',\s*requireAuth/);
      assert.match(routesSource, /cancel',\s*requireAuth/);
   });

   it('validates metadata, optional untouched forms, and duplicate options', () => {
      const question = {
         id: 'q',
         fieldType: 'CHECKBOX',
         isRequired: true,
         validation: { minSelections: 2, maxSelections: 2 },
         options: [{ id: 'a' }, { id: 'b' }],
      };
      assert.deepEqual(validateFreshSubmission([question], [], false), []);
      const errors = validateFreshSubmission(
         [question],
         [
            {
               formQuestionId: 'q',
               textValue: null,
               numberValue: null,
               dateValue: null,
               selectedOptions: [{ optionId: 'a' }, { optionId: 'a' }],
            },
         ],
         true,
      );
      assert.ok(errors.some((error) => error.code === 'DUPLICATE_OPTION'));
   });

   it('keeps rejected, expired, and cancelled states terminal', () => {
      assert.equal(isTerminalRegistrationStatus('REJECTED'), true);
      assert.equal(isTerminalRegistrationStatus('EXPIRED'), true);
      assert.equal(isTerminalRegistrationStatus('CANCELLED'), true);
      assert.equal(isTerminalRegistrationStatus('APPROVED'), false);
   });

   it('enforces atomic CAS, member ownership, fresh submit validation, and scoped replay', () => {
      assert.match(repositorySource, /throw new ResponseRevisionConflict/);
      assert.match(
         repositorySource,
         /orderMemberId: \{ in: \[\.\.\.ownMemberIds\] \}/,
      );
      assert.match(
         repositorySource,
         /buyerUserId: userId,[\s\S]*idempotencyKey,[\s\S]*idempotencyFingerprint: fingerprint/,
      );
      assert.match(repositorySource, /validateFreshSubmission/);
      assert.match(repositorySource, /claimedBy: userId/);
      assert.match(repositorySource, /submission\.assignmentRequired/);
   });

   it('renders and submits the exact draft form snapshot without current assignments', () => {
      assert.match(serviceSource, /mapSubmissionForms\(visibleSubmissions\)/);
      assert.match(serviceSource, /submission\.assignmentAudience/);
      const submitSource = repositorySource.slice(
         repositorySource.indexOf('async submit('),
         repositorySource.indexOf('async cancel('),
      );
      assert.doesNotMatch(submitSource, /registrationFormAssignment\.findMany/);
      assert.match(submitSource, /order\.submissions\.flatMap/);
   });

   it('self-heals only zero-submission drafts from current applicable assignments', () => {
      assert.match(repositorySource, /existing\.submissions\.length > 0/);
      assert.match(repositorySource, /registrationFormSubmission\.createMany/);
      assert.match(
         repositorySource,
         /assignmentAudience: assignment\.audience/,
      );
      assert.match(repositorySource, /UNSUPPORTED_FILE_QUESTION/);
      assert.match(
         repositorySource,
         /none:\s*\{[\s\S]*ticketPackageId:[\s\S]*existing\.ticketPackageId/,
      );
   });

   it('filters anonymous events and authorizes external destinations first', () => {
      assert.match(repositorySource, /visibility: 'PUBLIC'/);
      assert.ok(
         serviceSource.indexOf("source.registrationMode === 'EXTERNAL'") >
            serviceSource.indexOf("source.visibility === 'PUBLIC'"),
      );
      assert.match(serviceSource, /item\.id === registration\.ticketPackageId/);
   });

   it('cascades event cancellation through orders, members, holds, and history', () => {
      assert.match(
         eventRepositorySource,
         /registrationCapacityHold\.updateMany/,
      );
      assert.match(
         eventRepositorySource,
         /registrationOrderMember\.updateMany/,
      );
      assert.match(eventRepositorySource, /registrationStatusHistory\.create/);
      assert.match(eventRepositorySource, /registrationOrder\.updateMany/);
      assert.match(eventRepositorySource, /ORDER BY "id" FOR UPDATE/);
      assert.match(eventRepositorySource, /registrationTicket\.updateMany/);
      assert.match(subEventRepositorySource, /FOR UPDATE/);
      assert.match(subEventRepositorySource, /registrationTicket\.updateMany/);
   });

   it('locks before submit lifecycle reads and revalidates package sales state', () => {
      const submitStart = repositorySource.indexOf('async submit(');
      const submitSource = repositorySource.slice(submitStart);
      assert.ok(
         submitSource.indexOf('FOR UPDATE') <
            submitSource.indexOf(
               "if (!['DRAFT', 'NEEDS_CORRECTION'].includes(order.status))",
            ),
      );
      assert.match(submitSource, /ticketPackage\.status !== 'ACTIVE'/);
      assert.match(submitSource, /ticketPackage\.salesStartAt/);
      assert.match(submitSource, /ticketPackage\.salesEndAt/);
   });

   it('scopes participant detail and resets draft invitations on cancellation', () => {
      assert.match(serviceSource, /ownMemberIds/);
      assert.match(serviceSource, /submission\.orderMemberId === null/);
      assert.match(
         repositorySource,
         /status: 'PENDING',[\s\S]*claimedBy: null,[\s\S]*orderMemberId: null/,
      );
      assert.match(repositorySource, /registrationTicket\.updateMany/);
   });
});
