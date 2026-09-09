import assert from 'node:assert/strict';
import test from 'node:test';
import { Prisma } from '@prisma/client';
import { prisma } from '@/config/prisma.js';
import {
   eventPaymentRepository as repo,
   type PaymentRecord,
} from './eventPaymentRepository.js';
import {
   eventPaymentService as service,
   paymentResponse,
} from './eventPaymentService.js';
import {
   acknowledgementsComplete,
   paymentDeadline,
} from './eventPaymentTypes.js';
import { PaymentCorrectionSchema } from './eventPaymentSchema.js';

const mockTransaction = (
   t: test.TestContext,
   replacement: (...args: any[]) => Promise<unknown>,
) => {
   const original = prisma.$transaction;
   prisma.$transaction = replacement as typeof prisma.$transaction;
   t.after(() => {
      prisma.$transaction = original;
   });
};

const future = new Date(Date.now() + 3_600_000);
const fixture = () =>
   ({
      id: 'payment',
      registrationOrderId: 'order',
      status: 'REVIEW',
      amountMinor: 100n,
      currency: 'IDR',
      expiresAt: future,
      bankSnapshot: {
         bankName: 'Bank',
         accountNumber: '123',
         accountHolder: 'HIMTI',
         instructions: null,
      },
      order: {
         id: 'order',
         eventId: 'event',
         status: 'PAYMENT_REVIEW',
         revision: 4,
         seatCount: 2,
         paymentDeadlineAt: future,
         event: {
            id: 'event',
            name: 'Event',
            startsAt: future,
            registrationClosesAt: future,
            paymentProofTypes: ['image/png'],
         },
         ticketPackage: { name: 'Pair', salesEndAt: future },
         capacityHold: { status: 'ACTIVE', quantity: 2, expiresAt: future },
         members: ['a', 'b'].map((id) => ({
            id,
            userId: id,
            status: 'LOCKED',
            snapshotName: id,
            snapshotEmail: `${id}@example.com`,
         })),
      },
      proofs: ['a', 'b'].map((id) => ({
         id: `proof-${id}`,
         paymentId: 'payment',
         orderMemberId: id,
         uploadedByUserId: id,
         uploadId: `upload-${id}`,
         status: 'CURRENT',
         submittedAt: new Date(),
         upload: {
            ownerUserId: id,
            status: 'AVAILABLE',
            purpose: 'PAYMENT_PROOF',
            mediaType: 'image/png',
            sizeBytes: 12,
            sha256: id,
            storageKey: 'never expose',
         },
      })),
      correctionTargets: [],
   }) as unknown as PaymentRecord;

test('aggregate readiness requires exact roster and every proof with no unresolved correction', () => {
   const proofs = [
      { orderMemberId: 'a', status: 'CURRENT' },
      { orderMemberId: 'b', status: 'CURRENT' },
   ];
   assert.equal(acknowledgementsComplete(['a', 'b'], proofs, [], 2), true);
   assert.equal(
      acknowledgementsComplete(['a', 'b'], proofs.slice(0, 1), [], 2),
      false,
   );
   assert.equal(
      acknowledgementsComplete(['a', 'b'], proofs, [{ resolvedAt: null }], 2),
      false,
   );
   assert.equal(acknowledgementsComplete(['a'], proofs, [], 2), false);
   assert.equal(acknowledgementsComplete(['a'], proofs, [], 1), true);
});

test('correction deadline is server bounded and targets/reason are validated', () => {
   const now = new Date('2026-01-01T00:00:00Z');
   assert.equal(
      paymentDeadline(now, []).toISOString(),
      '2026-01-02T00:00:00.000Z',
   );
   assert.equal(
      paymentDeadline(now, [new Date('2026-01-01T01:00:00Z')]).toISOString(),
      '2026-01-01T01:00:00.000Z',
   );
   for (const body of [
      { expectedRevision: 1, memberIds: [], reason: 'fix' },
      { expectedRevision: 1, memberIds: ['a', 'a'], reason: 'fix' },
      { expectedRevision: 1, memberIds: ['a'], reason: ' ' },
      {
         expectedRevision: 1,
         memberIds: ['a'],
         reason: 'fix',
         deadlineAt: future,
      },
   ])
      assert.equal(PaymentCorrectionSchema.safeParse(body).success, false);
});

test('participant response contains only self metadata and shared counts, never storage or peer identity', () => {
   const response = paymentResponse(fixture(), 'a');
   assert.equal(response.amountMinor, '100');
   assert.equal(response.acknowledgementCount, 2);
   assert.deepEqual(
      response.members.map((member) => member.id),
      ['a'],
   );
   assert.equal('email' in response.members[0]!, false);
   assert.equal(JSON.stringify(response).includes('never expose'), false);
   assert.equal(JSON.stringify(response).includes('b@example.com'), false);
});

test('repository performs targeted correction, replacement, atomic approval and idempotent reapproval', async (t) => {
   const payment = fixture();
   const locks: string[] = [];
   let tickets = 0;
   const tx = {
      $queryRaw: async (strings: TemplateStringsArray) => {
         locks.push(strings.join('?'));
      },
      user: { findFirst: async () => ({ id: 'reviewer' }) },
      event: { findFirst: async () => ({ id: 'event' }) },
      registrationPayment: {
         findUnique: async () => ({
            registrationOrderId: 'order',
            order: { eventId: 'event' },
         }),
         findUniqueOrThrow: async () => payment,
         update: async ({ data }: { data: object }) =>
            Object.assign(payment, data),
      },
      registrationOrder: {
         update: async ({
            data,
         }: {
            data: { status: PaymentRecord['order']['status'] };
         }) => {
            payment.order.status = data.status;
            payment.order.revision++;
         },
      },
      registrationCapacityHold: {
         update: async ({ data }: { data: object }) =>
            Object.assign(payment.order.capacityHold!, data),
      },
      registrationTicket: {
         createMany: async ({ data }: { data: unknown[] }) => {
            tickets += data.length;
         },
      },
      registrationStatusHistory: { create: async () => ({}) },
      paymentCorrectionTarget: {
         createMany: async ({
            data,
         }: {
            data: PaymentRecord['correctionTargets'];
         }) => {
            payment.correctionTargets.push(
               ...data.map((target) => ({ ...target, resolvedAt: null })),
            );
         },
         updateMany: async ({
            where,
         }: {
            where: { orderMemberId: string };
         }) => {
            payment.correctionTargets
               .filter((target) => target.orderMemberId === where.orderMemberId)
               .forEach((target) => {
                  target.resolvedAt = new Date();
               });
         },
         findMany: async () =>
            payment.correctionTargets.filter((target) => !target.resolvedAt),
      },
      privateUpload: { create: async () => ({}) },
      registrationPaymentProof: {
         updateMany: async ({
            where,
         }: {
            where: { orderMemberId: string };
         }) => {
            payment.proofs
               .filter((proof) => proof.orderMemberId === where.orderMemberId)
               .forEach((proof) => {
                  proof.status = 'SUPERSEDED';
               });
         },
         create: async ({
            data,
         }: {
            data: Partial<PaymentRecord['proofs'][number]>;
         }) => {
            payment.proofs.push({
               ...payment.proofs[0]!,
               ...data,
               status: 'CURRENT',
            });
         },
         findMany: async () =>
            payment.proofs.filter((proof) => proof.status === 'CURRENT'),
      },
   };
   mockTransaction(
      t,
      async (
         callback: (tx: unknown) => unknown,
         options: { isolationLevel: string },
      ) => {
         assert.equal(options.isolationLevel, 'Serializable');
         return callback(tx);
      },
   );
   await repo.mutate('payment', 'reviewer', 'request-correction', {
      expectedRevision: 4,
      memberIds: ['a'],
      reason: 'Unreadable',
   });
   assert.equal(payment.status, 'COLLECTING');
   assert.equal(payment.proofs[1]!.status, 'CURRENT');
   assert.equal(payment.correctionTargets[0]!.reason, 'Unreadable');
   await repo.mutate(
      'payment',
      'a',
      'upload',
      { expectedRevision: 5 },
      {
         id: 'replacement',
         storageKey: 'private',
         mediaType: 'image/png',
         originalFilename: 'proof.png',
         sizeBytes: 12,
         sha256: 'a',
      },
   );
   assert.equal(payment.status, 'REVIEW');
   assert.equal(payment.proofs[0]!.status, 'SUPERSEDED');
   assert.equal(payment.proofs[1]!.status, 'CURRENT');
   assert.ok(payment.correctionTargets[0]!.resolvedAt);
   await repo.mutate('payment', 'reviewer', 'approve', { expectedRevision: 6 });
   assert.equal(payment.status, 'VERIFIED');
   assert.equal(payment.order.status, 'CONFIRMED');
   assert.equal(payment.order.capacityHold!.status, 'CONSUMED');
   assert.equal(tickets, 2);
   await repo.mutate('payment', 'reviewer', 'approve', { expectedRevision: 6 });
   assert.equal(tickets, 2);
   assert.ok(locks[0]!.includes('FROM events'));
   assert.ok(locks[1]!.includes('FROM registration_orders'));
   assert.ok(locks[2]!.includes('FROM registration_payments'));
});

test('expiry and rejection release all seats and inactive memberships; stale approval and foreign upload do not mutate', async (t) => {
   let payment = fixture();
   const writes: string[] = [];
   const tx = {
      $queryRaw: async () => [],
      user: { findFirst: async () => ({ id: 'reviewer' }) },
      event: { findFirst: async () => ({ id: 'event' }) },
      registrationPayment: {
         findUnique: async () => ({
            registrationOrderId: 'order',
            order: { eventId: 'event' },
         }),
         findUniqueOrThrow: async () => payment,
         update: async ({ data }: { data: object }) => {
            writes.push('payment');
            Object.assign(payment, data);
         },
      },
      registrationCapacityHold: {
         updateMany: async ({ data }: { data: object }) => {
            writes.push('hold');
            Object.assign(payment.order.capacityHold!, data);
         },
      },
      registrationOrderMember: {
         updateMany: async () => {
            writes.push('members');
            payment.order.members.forEach((member) => {
               member.status = 'LEFT';
            });
         },
      },
      registrationOrder: {
         update: async ({
            data,
         }: {
            data: { status: PaymentRecord['order']['status'] };
         }) => {
            writes.push('order');
            payment.order.status = data.status;
         },
      },
      registrationStatusHistory: {
         create: async () => {
            writes.push('history');
         },
      },
   };
   mockTransaction(t, async (callback: (tx: unknown) => unknown) =>
      callback(tx),
   );
   await assert.rejects(
      repo.mutate('payment', 'reviewer', 'approve', { expectedRevision: 1 }),
      /changed/,
   );
   await assert.rejects(
      repo.mutate('payment', 'outsider', 'upload', { expectedRevision: 4 }),
      /not found/,
   );
   assert.deepEqual(writes, []);
   payment.correctionTargets.push({
      resolvedAt: null,
      deadlineAt: new Date(0),
   } as PaymentRecord['correctionTargets'][number]);
   assert.equal(await repo.mutate('payment', null, 'expire'), 'EXPIRED');
   assert.equal(payment.order.capacityHold!.status, 'EXPIRED');
   assert.ok(payment.order.members.every((member) => member.status === 'LEFT'));
   assert.deepEqual(writes, ['payment', 'hold', 'members', 'order', 'history']);
   assert.equal(await repo.mutate('payment', null, 'expire'), 'UNCHANGED');
   payment = fixture();
   assert.equal(
      await repo.mutate('payment', 'reviewer', 'reject', {
         expectedRevision: 4,
         reason: 'Invalid transfer',
      }),
      'REJECTED',
   );
   assert.equal(payment.order.capacityHold!.status, 'RELEASED');
});

test('serialization conflict retries the complete transaction', async (t) => {
   let calls = 0;
   mockTransaction(t, async () => {
      if (++calls < 3)
         throw new Prisma.PrismaClientKnownRequestError('retry', {
            code: 'P2034',
            clientVersion: '6',
         });
      return 'UNCHANGED';
   });
   assert.equal(await repo.mutate('payment', null, 'expire'), 'UNCHANGED');
   assert.equal(calls, 3);
});

test('private proof content denies peers and mismatched typed ownership before storage access', async (t) => {
   const proof = {
      uploadedByUserId: 'a',
      orderMember: { userId: 'a' },
      upload: {
         status: 'AVAILABLE',
         purpose: 'PAYMENT_PROOF',
         ownerUserId: 'a',
      },
      payment: { order: { eventId: 'event' } },
   };
   t.mock.method(repo, 'proof', async () => proof);
   t.mock.method(repo, 'hasPermission', async () => null);
   await assert.rejects(service.content('proof', { id: 'b' }), /permission/);
   proof.upload.ownerUserId = 'b';
   await assert.rejects(service.content('proof', { id: 'a' }), /not found/);
});
