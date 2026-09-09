import { createHash } from 'node:crypto';
import { fileTypeFromBuffer } from 'file-type';
import {
   eventService,
   PAYMENT_PROOF_MAX_BYTES,
   PAYMENT_PROOF_TYPES,
} from '@/features/events/eventService.js';
import { AppError } from '@/utils/appError.js';
import { isAdminUser } from '@/utils/statusAccess.js';
import { stagePrivateFile, openPrivateFile } from '@/storage/privateStorage.js';
import {
   eventPaymentRepository as repo,
   type PaymentRecord,
} from './eventPaymentRepository.js';
import type { PaymentActor, PaymentMutation } from './eventPaymentTypes.js';

export const paymentResponse = (payment: PaymentRecord, userId?: string) => {
   const members = payment.order.members.filter(
      (member) => member.status === 'LOCKED',
   );
   const current = payment.proofs.filter(
      (proof) =>
         proof.status === 'CURRENT' && proof.upload.status === 'AVAILABLE',
   );
   return {
      id: payment.id,
      registrationId: payment.registrationOrderId,
      eventId: payment.order.eventId,
      eventName: payment.order.event.name,
      packageName: payment.order.ticketPackage.name,
      status: payment.status,
      orderStatus: payment.order.status,
      revision: payment.order.revision,
      currency: payment.currency,
      amountMinor: payment.amountMinor.toString(),
      bank: payment.bankSnapshot,
      expiresAt: payment.expiresAt?.toISOString() ?? null,
      requiredCount: payment.order.seatCount,
      acknowledgementCount: current.filter(
         (proof) =>
            members.some((member) => member.id === proof.orderMemberId) &&
            !payment.correctionTargets.some(
               (target) =>
                  target.orderMemberId === proof.orderMemberId &&
                  !target.resolvedAt,
            ),
      ).length,
      allowedMediaTypes: [...PAYMENT_PROOF_TYPES],
      maxBytes: PAYMENT_PROOF_MAX_BYTES,
      members: payment.order.members
         .filter((member) => (userId ? member.userId === userId : true))
         .map((member) => ({
            id: member.id,
            name: member.snapshotName,
            ...(!userId && { email: member.snapshotEmail }),
            correction: (() => {
               const target = payment.correctionTargets.find(
                  (target) =>
                     target.orderMemberId === member.id && !target.resolvedAt,
               );
               return target
                  ? {
                       reason: target.reason,
                       deadlineAt: target.deadlineAt.toISOString(),
                    }
                  : null;
            })(),
            proofs: payment.proofs
               .filter((proof) => proof.orderMemberId === member.id)
               .map((proof) => ({
                  id: proof.id,
                  status: proof.status,
                  mediaType: proof.upload.mediaType,
                  sizeBytes: proof.upload.sizeBytes,
                  submittedAt: proof.submittedAt.toISOString(),
                  contentUrl: `/api/private/payment-proofs/${proof.id}/content`,
               })),
         })),
   };
};

export class EventPaymentService {
   async participant(registrationId: string, user: PaymentActor) {
      const payment = await repo.forRegistration(registrationId, user.id);
      if (!payment) throw new AppError('Payment not found', 404);
      return paymentResponse(payment, user.id);
   }
   async internal(id: string, user: PaymentActor) {
      const payment = await repo.get(id);
      if (!payment) throw new AppError('Payment not found', 404);
      await eventService.assertScope(payment.order.eventId, user);
      return paymentResponse(payment);
   }
   async internalForRegistration(
      eventId: string,
      registrationId: string,
      user: PaymentActor,
   ) {
      await eventService.assertScope(eventId, user);
      const payment = await repo.getForInternalRegistration(registrationId);
      if (!payment || payment.order.eventId !== eventId)
         throw new AppError('Payment not found', 404);
      return paymentResponse(payment);
   }
   async queue(
      eventId: string,
      query: Parameters<typeof repo.queue>[1],
      user: PaymentActor,
   ) {
      await eventService.assertScope(eventId, user);
      const result = await repo.queue(eventId, query);
      return {
         ...result,
         data: result.data.map((payment) => paymentResponse(payment)),
      };
   }
   async review(
      id: string,
      action: 'approve' | 'request-correction' | 'reject',
      body: PaymentMutation,
      user: PaymentActor,
   ) {
      await this.internal(id, user);
      const result = await repo.mutate(
         id,
         user.id,
         action,
         body,
         undefined,
         isAdminUser(user),
      );
      if (result === 'EXPIRED')
         throw new AppError('Payment deadline expired', 409);
      return this.internal(id, user);
   }
   async upload(
      id: string,
      body: PaymentMutation,
      file: Express.Multer.File | undefined,
      key: string,
      user: PaymentActor,
   ) {
      const payment = await repo.get(id);
      if (
         !payment ||
         !payment.order.members.some(
            (member) => member.userId === user.id && member.status === 'LOCKED',
         )
      )
         throw new AppError('Payment not found', 404);
      if (!file || !file.size || file.size > PAYMENT_PROOF_MAX_BYTES)
         throw new AppError(
            'A proof file of at most 1572864 bytes is required',
            400,
         );
      const detected = await fileTypeFromBuffer(file.buffer).catch(
         () => undefined,
      );
      if (
         !detected ||
         !PAYMENT_PROOF_TYPES.includes(
            detected.mime as (typeof PAYMENT_PROOF_TYPES)[number],
         ) ||
         detected.mime !== file.mimetype ||
         !payment.order.event.paymentProofTypes.includes(detected.mime)
      )
         throw new AppError(
            'Proof content does not match an allowed file type',
            400,
         );
      const uploadId = createHash('sha256')
         .update(`${user.id}\0${id}\0${key}`)
         .digest('hex');
      const staged = await stagePrivateFile(file.buffer);
      try {
         // Make the bytes durable before committing their database reference. Never remove an older proof.
         await staged.commit();
         const result = await repo.mutate(id, user.id, 'upload', body, {
            id: uploadId,
            storageKey: staged.key,
            mediaType: detected.mime,
            originalFilename: `payment-proof.${detected.ext}`,
            sizeBytes: file.size,
            sha256: createHash('sha256').update(file.buffer).digest('hex'),
         });
         if (result === 'EXPIRED')
            throw new AppError('Payment deadline expired', 409);
         if (result === 'UNCHANGED') await staged.discard();
      } catch (error) {
         // A lost commit response is ambiguous: retain bytes if the database cannot confirm rollback.
         const stored = await repo.storedUpload(uploadId);
         if (stored?.storageKey !== staged.key) await staged.discard();
         throw error;
      }
      return this.participant(payment.registrationOrderId, user);
   }
   async content(id: string, user: PaymentActor) {
      const proof = await repo.proof(id);
      if (
         !proof ||
         proof.upload.status !== 'AVAILABLE' ||
         proof.upload.purpose !== 'PAYMENT_PROOF' ||
         proof.upload.ownerUserId !== proof.uploadedByUserId ||
         proof.orderMember.userId !== proof.uploadedByUserId
      )
         throw new AppError('Proof not found', 404);
      if (proof.uploadedByUserId !== user.id) {
         if (
            !(await repo.hasPermission(user.id, 'review_event_payments')) ||
            !(await repo.hasPermission(user.id, 'view_payment_proofs'))
         )
            throw new AppError('Payment proof permission required', 403);
         await eventService.assertScope(proof.payment.order.eventId, user);
      }
      return {
         stream: await openPrivateFile(proof.upload.storageKey),
         mediaType: proof.upload.mediaType,
      };
   }
   async expire() {
      for (const payment of await repo.expiryCandidates()) {
         try {
            await repo.mutate(payment.id, null, 'expire');
         } catch {
            console.error(
               'Payment expiry failed for one order; continuing batch',
            );
         }
      }
   }
}

export const eventPaymentService = new EventPaymentService();

export const startPaymentExpiry = () => {
   let running = false;
   const tick = async () => {
      if (running) return;
      running = true;
      try {
         await eventPaymentService.expire();
      } catch {
         console.error(
            'Payment expiry processing failed; retrying next interval',
         );
      } finally {
         running = false;
      }
   };
   void tick();
   const timer = setInterval(() => void tick(), 30_000);
   timer.unref();
   return () => clearInterval(timer);
};
