import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { readdir } from 'node:fs/promises';
import { prisma } from '@/config/prisma.js';
import { eventPaymentRepository as repo } from './eventPaymentRepository.js';
import { eventPaymentService as service } from './eventPaymentService.js';

// Run only against the disposable native cluster documented in PHASE5-VERIFICATION.md.
const enabled = process.env.PHASE5_POSTGRES_TEST === 'true';
test(
   'isolated PostgreSQL: ownership, replacements, rollback, concurrent approval, expiry and whole-order counting',
   { skip: !enabled },
   async (t) => {
      const url = new URL(process.env.DATABASE_URL!);
      assert.equal(url.hostname, '127.0.0.1');
      assert.equal(url.port, '55435');
      assert.equal(url.username, 'phase5');
      assert.equal(
         process.env.PRIVATE_UPLOAD_ROOT,
         '/tmp/opencode/phase5-uploads',
      );
      t.after(() => prisma.$disconnect());
      const suffix = randomUUID();
      const users = await Promise.all(
         ['a', 'b', 'reviewer', 'outsider'].map((name) =>
            prisma.user.create({
               data: { name, email: `${name}-${suffix}@example.com` },
            }),
         ),
      );
      const [a, b, reviewer, outsider] = users;
      const permission = await prisma.permission.upsert({
         where: { name: 'review_event_payments' },
         create: { name: 'review_event_payments', createdBy: reviewer!.id },
         update: {},
      });
      const role = await prisma.role.create({
         data: {
            roleName: `reviewer-${suffix}`,
            createdBy: reviewer!.id,
            roleHasPermissions: { create: { permissionId: permission.id } },
            roleHasUsers: { create: { userId: reviewer!.id } },
         },
      });
      assert.ok(role.id);
      const deadline = new Date(Date.now() + 3_600_000);
      const event = await prisma.event.create({
         data: {
            name: 'Payment integration',
            createdBy: reviewer!.id,
            startsAt: deadline,
            organizers: { create: { userId: reviewer!.id } },
         },
      });
      const pkg = await prisma.ticketPackage.create({
         data: {
            eventId: event.id,
            name: 'Pair',
            code: suffix,
            seatCount: 2,
            priceMinor: 100n,
         },
      });
      const makeOrder = async (seats = 2) =>
         prisma.registrationOrder.create({
            data: {
               eventId: event.id,
               ticketPackageId: pkg.id,
               orderNumber: randomUUID(),
               seatCount: seats,
               currency: 'IDR',
               subtotalMinor: 100n,
               totalMinor: 100n,
               status: 'PENDING_PAYMENT',
               paymentDeadlineAt: deadline,
               members: {
                  create: [a!, b!]
                     .slice(0, seats)
                     .map((user, position) => ({
                        eventId: event.id,
                        userId: user.id,
                        position,
                        status: 'LOCKED',
                     })),
               },
               capacityHold: {
                  create: {
                     eventId: event.id,
                     quantity: seats,
                     expiresAt: deadline,
                  },
               },
               payment: {
                  create: {
                     currency: 'IDR',
                     amountMinor: 100n,
                     expiresAt: deadline,
                  },
               },
            },
            include: { members: true, payment: true },
         });
      const order = await makeOrder();
      const paymentId = order.payment!.id;
      const file = (id = randomUUID()) => ({
         id,
         storageKey: `${randomUUID()}/${randomUUID()}`,
         mediaType: 'image/png',
         originalFilename: 'proof.png',
         sizeBytes: 12,
         sha256: 'a'.repeat(64),
      });
      await assert.rejects(
         repo.mutate(
            paymentId,
            outsider!.id,
            'upload',
            { expectedRevision: 1 },
            file(),
         ),
         /not found/,
      );
      await repo.mutate(
         paymentId,
         a!.id,
         'upload',
         { expectedRevision: 1 },
         file(),
      );
      assert.equal((await repo.get(paymentId))!.status, 'COLLECTING');
      await repo.mutate(
         paymentId,
         b!.id,
         'upload',
         { expectedRevision: 2 },
         file(),
      );
      assert.equal((await repo.get(paymentId))!.status, 'REVIEW');
      await assert.rejects(
         repo.mutate(paymentId, outsider!.id, 'approve', {
            expectedRevision: 3,
         }),
         /permission/,
      );
      await repo.mutate(paymentId, reviewer!.id, 'request-correction', {
         expectedRevision: 3,
         memberIds: [order.members[0]!.id],
         reason: 'Unreadable',
      });
      const corrected = await repo.get(paymentId);
      assert.equal(
         corrected!.proofs.filter((proof) => proof.status === 'CURRENT').length,
         2,
      );
      assert.ok(corrected!.correctionTargets[0]!.deadlineAt <= deadline);
      const replacement = file();
      await repo.mutate(
         paymentId,
         a!.id,
         'upload',
         { expectedRevision: 4 },
         replacement,
      );
      await repo.mutate(
         paymentId,
         a!.id,
         'upload',
         { expectedRevision: 4 },
         replacement,
      );
      assert.equal((await repo.get(paymentId))!.proofs.length, 3);
      // A ticket conflict happens after hold consumption; PostgreSQL must roll back every earlier write.
      const conflictingTicket = await prisma.registrationTicket.create({
         data: {
            eventId: event.id,
            orderMemberId: order.members[0]!.id,
            tokenHash: randomUUID(),
         },
      });
      await assert.rejects(
         repo.mutate(paymentId, reviewer!.id, 'approve', {
            expectedRevision: 5,
         }),
      );
      assert.equal(
         (await repo.get(paymentId))!.order.capacityHold!.status,
         'ACTIVE',
      );
      assert.equal((await repo.get(paymentId))!.status, 'REVIEW');
      await prisma.registrationTicket.delete({
         where: { id: conflictingTicket.id },
      });
      await Promise.all([
         repo.mutate(paymentId, reviewer!.id, 'approve', {
            expectedRevision: 5,
         }),
         repo.mutate(paymentId, reviewer!.id, 'approve', {
            expectedRevision: 5,
         }),
      ]);
      assert.equal(
         await prisma.registrationTicket.count({
            where: { orderMember: { registrationOrderId: order.id } },
         }),
         2,
      );
      assert.equal(
         (await repo.get(paymentId))!.order.capacityHold!.status,
         'CONSUMED',
      );
      assert.equal(
         (
            await prisma.registrationPayment.aggregate({
               where: { id: paymentId, status: 'VERIFIED' },
               _sum: { amountMinor: true },
            })
         )._sum.amountMinor,
         100n,
      );
      const badUpload = await prisma.privateUpload.create({
         data: {
            ...file(),
            ownerUserId: outsider!.id,
            purpose: 'PAYMENT_PROOF',
            status: 'AVAILABLE',
         },
      });
      await assert.rejects(
         prisma.registrationPaymentProof.create({
            data: {
               paymentId,
               orderMemberId: order.members[0]!.id,
               uploadedByUserId: a!.id,
               uploadId: badUpload.id,
               status: 'SUPERSEDED',
            },
         }),
      );
      await prisma.registrationOrderMember.updateMany({
         where: { registrationOrderId: order.id },
         data: { status: 'LEFT' },
      });
      const second = await makeOrder(1);
      await prisma.registrationPayment.update({
         where: { id: second.payment!.id },
         data: { expiresAt: new Date(0) },
      });
      await service.expire();
      const expired = await repo.get(second.payment!.id);
      assert.equal(expired!.status, 'EXPIRED');
      assert.equal(expired!.order.capacityHold!.status, 'EXPIRED');
      assert.ok(
         expired!.order.members.every((member) => member.status === 'LEFT'),
      );
      const rejected = await makeOrder(1);
      await repo.mutate(rejected.payment!.id, reviewer!.id, 'reject', {
         expectedRevision: 1,
         reason: 'Invalid transfer',
      });
      assert.equal(
         (await repo.get(rejected.payment!.id))!.order.capacityHold!.status,
         'RELEASED',
      );
      const uploaded = await makeOrder(1);
      const bytes = Buffer.from(
         'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=',
         'base64',
      );
      const realFile = {
         buffer: bytes,
         size: bytes.length,
         mimetype: 'image/png',
      } as Express.Multer.File;
      await assert.rejects(
         service.upload(
            uploaded.payment!.id,
            { expectedRevision: 1 },
            { ...realFile, buffer: Buffer.from('not an image') },
            'invalid-file',
            a!,
         ),
         /content/,
      );
      const before = await readdir(process.env.PRIVATE_UPLOAD_ROOT!).catch(
         () => [],
      );
      await assert.rejects(
         service.upload(
            uploaded.payment!.id,
            { expectedRevision: 99 },
            realFile,
            'rollback-file',
            a!,
         ),
         /changed/,
      );
      assert.deepEqual(await readdir(process.env.PRIVATE_UPLOAD_ROOT!), before);
      await service.upload(
         uploaded.payment!.id,
         { expectedRevision: 1 },
         realFile,
         'valid-file',
         a!,
      );
      const stored = await repo.get(uploaded.payment!.id);
      assert.equal(stored!.status, 'REVIEW');
      const content = await service.content(stored!.proofs[0]!.id, a!);
      const chunks: Buffer[] = [];
      for await (const chunk of content.stream) chunks.push(Buffer.from(chunk));
      assert.deepEqual(Buffer.concat(chunks), bytes);
      await assert.rejects(
         service.content(stored!.proofs[0]!.id, b!),
         /permission/,
      );
      await repo.mutate(uploaded.payment!.id, reviewer!.id, 'approve', {
         expectedRevision: 2,
      });
      assert.equal(
         await prisma.registrationTicket.count({
            where: { orderMember: { registrationOrderId: uploaded.id } },
         }),
         1,
      );
   },
);
