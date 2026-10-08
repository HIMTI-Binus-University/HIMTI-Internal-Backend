import assert from 'node:assert/strict';
import test from 'node:test';
import { prisma } from '@/config/prisma.js';
import { eventRegistrationRepository as repo } from './eventRegistrationRepository.js';

test('original assembling answers stay pinned after publication and reject inactive members or locked submissions', async (t) => {
   const submission = {
      id: 'original-submission',
      registrationFormId: 'old-closed-form',
      status: 'DRAFT',
   };
   const member = { status: 'ACTIVE', submissions: [submission] };
   const writes: unknown[] = [];
   const reads: unknown[] = [];
   const tx = {
      $queryRaw: async () => [],
      registrationOrder: {
         findFirst: async (args: unknown) => {
            reads.push(args);
            return {
               revision: 4,
               status: 'ASSEMBLING',
               members: [member],
            };
         },
         update: async (args: unknown) => {
            writes.push(args);
         },
      },
      registrationFormSubmissionAnswer: {
         deleteMany: async (args: unknown) => {
            writes.push(args);
         },
         createMany: async (args: unknown) => {
            writes.push(args);
         },
      },
   };
   const original = prisma.$transaction;
   t.after(() => {
      prisma.$transaction = original;
   });
   prisma.$transaction = (async (operation: (client: typeof tx) => unknown) =>
      operation(tx)) as unknown as typeof prisma.$transaction;
   assert.deepEqual(
      await repo.replaceAnswers('order', 'session-user', 4, [
         {
            questionId: 'original-question',
            textValue: 'Answer',
            numberValue: null,
            dateValue: null,
            optionIds: [],
         },
      ]),
      { result: 'UPDATED' },
   );
   assert.match(JSON.stringify(writes), /original-submission/);
   assert.doesNotMatch(JSON.stringify(reads), /seatCount/);
   assert.doesNotMatch(
      JSON.stringify(writes),
      /supplemental|registrationFormId|payment|ticket/,
   );
   writes.length = 0;
   member.status = 'REMOVED';
   assert.deepEqual(await repo.replaceAnswers('order', 'session-user', 4, []), {
      result: 'LOCKED',
   });
   member.status = 'ACTIVE';
   submission.status = 'LOCKED';
   assert.deepEqual(await repo.replaceAnswers('order', 'session-user', 4, []), {
      result: 'LOCKED',
   });
   assert.equal(writes.length, 0);
});

test('Bundle members can update only their own active draft response', async (t) => {
   let query: unknown;
   const tx = {
      $queryRaw: async () => [],
      registrationOrder: {
         findFirst: async (args: unknown) => {
            query = args;
            return {
               revision: 2,
               status: 'ASSEMBLING',
               members: [
                  {
                     status: 'ACTIVE',
                     submissions: [
                        { id: 'member-submission', status: 'DRAFT' },
                     ],
                  },
               ],
            };
         },
         update: async () => undefined,
      },
      registrationFormSubmissionAnswer: {
         deleteMany: async () => undefined,
         createMany: async () => undefined,
      },
   };
   const original = prisma.$transaction;
   t.after(() => {
      prisma.$transaction = original;
   });
   prisma.$transaction = (async (operation: (client: typeof tx) => unknown) =>
      operation(tx)) as unknown as typeof prisma.$transaction;
   assert.deepEqual(await repo.replaceAnswers('bundle', 'member-user', 2, []), {
      result: 'UPDATED',
   });
   assert.match(JSON.stringify(query), /member-user/);
   assert.match(JSON.stringify(query), /"status":"ACTIVE"/);
   assert.doesNotMatch(JSON.stringify(query), /seatCount/);
});
