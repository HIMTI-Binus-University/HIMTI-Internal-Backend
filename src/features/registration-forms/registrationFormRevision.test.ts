import assert from 'node:assert/strict';
import test from 'node:test';
import { prisma } from '@/config/prisma.js';
import { registrationFormRepository as repo } from './registrationFormRepository.js';
import { RegistrationFormBodySchema } from './registrationFormSchema.js';

test('published edits preserve identity, assign additions and withdraw only unanswered deletions', async (t) => {
   const writes: Record<string, unknown>[] = [];
   const current = {
      id: 'old',
      revision: 4,
      version: 2,
      status: 'PUBLISHED',
      sections: [
         { questions: [{ logicalId: 'keep' }, { logicalId: 'delete' }] },
      ],
   };
   const form = {
      id: 'new',
      sections: [
         {
            questions: [
               { id: 'q1', logicalId: 'keep' },
               { id: 'q2', logicalId: 'added' },
            ],
         },
      ],
   };
   const tx = {
      $queryRaw: async () => [],
      registrationForm: {
         findFirst: async (args: { where: { status?: string } }) =>
            args.where.status
               ? current
               : {
                    ...current,
                    id: 'legacy-draft',
                    version: 8,
                    status: 'DRAFT',
                 },
         update: async () => ({}),
         create: async (args: Record<string, unknown>) => {
            writes.push(args);
            return form;
         },
      },
      registrationOrderMember: {
         findMany: async (args: Record<string, unknown>) => {
            writes.push(args);
            return [{ id: 'member' }];
         },
         updateMany: async () => ({}),
      },
      supplementalQuestionRequest: {
         updateMany: async (args: Record<string, unknown>) => {
            writes.push(args);
            return {};
         },
         createMany: async (args: Record<string, unknown>) => {
            writes.push(args);
            return {};
         },
      },
   };
   const original = prisma.$transaction;
   t.after(() => {
      prisma.$transaction = original;
   });
   prisma.$transaction = (async (operation: (client: typeof tx) => unknown) =>
      operation(tx)) as unknown as typeof prisma.$transaction;
   const body = RegistrationFormBodySchema.parse({
      expectedRevision: 4,
      name: 'Form',
      sections: [
         {
            title: 'Details',
            questions: [
               {
                  logicalId: 'keep',
                  fieldKey: 'renamed',
                  label: 'Renamed',
                  type: 'TEXT',
               },
               { fieldKey: 'new_question', label: 'New', type: 'TEXT' },
            ],
         },
      ],
   });
   assert.equal(await repo.save('event', body), form);
   assert.equal((writes[0]!.data as { version: number }).version, 9);
   assert.deepEqual(writes.at(-1), {
      data: [{ orderMemberId: 'member', logicalId: 'added', questionId: 'q2' }],
   });
   assert.match(
      JSON.stringify(writes),
      /ASSEMBLING.*PENDING_PAYMENT.*PAYMENT_REVIEW.*CONFIRMED/,
   );
   assert.match(
      JSON.stringify(writes.at(-2)),
      /"answeredAt":null,"withdrawnAt":null/,
   );
   current.sections = [
      { questions: [{ logicalId: 'keep' }, { logicalId: 'added' }] },
   ];
   body.sections[0]!.questions[1]!.logicalId = 'added';
   await repo.save('event', body);
   assert.deepEqual(writes.at(-1), { data: [] });
   body.sections[0]!.questions.pop();
   form.sections[0]!.questions.pop();
   await repo.save('event', body);
   assert.deepEqual(writes.at(-1), { data: [] });
   assert.match(JSON.stringify(writes.at(-2)), /"notIn":\["keep"\]/);
   await assert.rejects(
      repo.save('event', { ...body, expectedRevision: 3 }),
      /Form changed/,
   );
   body.sections[0]!.questions[0]!.logicalId = 'another-event';
   await assert.rejects(repo.save('event', body), /identity/);
   body.sections[0]!.questions[0]!.logicalId = 'keep';
   body.sections[0]!.questions.push({ ...body.sections[0]!.questions[0]! });
   await assert.rejects(repo.save('event', body), /identity/);
});

test('legacy replacement drafts are retained but cannot be published or edited without lineage', async (t) => {
   const draft = {
      id: 'draft',
      eventId: 'event',
      status: 'DRAFT',
      revision: 1,
      version: 2,
      sections: [],
   };
   const tx = {
      $queryRaw: async () => [],
      registrationForm: {
         findFirst: async (args: {
            where: { status?: string; id?: unknown };
         }) => (args.where.status === 'PUBLISHED' ? null : draft),
      },
   };
   const original = prisma.$transaction;
   t.after(() => {
      prisma.$transaction = original;
   });
   prisma.$transaction = (async (operation: (client: typeof tx) => unknown) =>
      operation(tx)) as unknown as typeof prisma.$transaction;
   await assert.rejects(
      repo.publish('event', 'draft', 1),
      /Legacy replacement drafts cannot be published/,
   );
   await assert.rejects(
      repo.save(
         'event',
         RegistrationFormBodySchema.parse({
            expectedRevision: 1,
            name: 'Form',
            sections: [
               {
                  title: 'Details',
                  questions: [
                     { fieldKey: 'question', label: 'Question', type: 'TEXT' },
                  ],
               },
            ],
         }),
      ),
      /legacy replacement draft/,
   );
});

test('current form reads prefer published form over retained duplicate drafts', async (t) => {
   const original = prisma.registrationForm.findFirst;
   t.after(() => {
      prisma.registrationForm.findFirst = original;
   });
   let calls = 0;
   prisma.registrationForm.findFirst = (async (args: {
      where: { status?: string };
   }) => {
      calls++;
      assert.equal(args.where.status, 'PUBLISHED');
      return { id: 'published' };
   }) as unknown as typeof original;
   assert.equal((await repo.latest('event'))?.id, 'published');
   assert.equal(calls, 1);
});
