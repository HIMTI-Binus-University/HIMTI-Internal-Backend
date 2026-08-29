import { createHash } from 'node:crypto';
import { fileTypeFromBuffer } from 'file-type';
import { AppError } from '@/utils/appError.js';
import { eventCommitteeService } from '@/features/event-committee/eventCommitteeService.js';
import { openPrivateFile, stagePrivateFile } from '@/storage/privateStorage.js';
import {
   acceptedProofTypes,
   HARD_MAX_PROOF_BYTES,
} from './eventPaymentSchema.js';
import { eventPaymentRepository } from './eventPaymentRepository.js';
import { normalizePaymentBankSnapshot } from './paymentBankSnapshot.js';
import {
   internalPaymentDetailSchema,
   participantPaymentDetailSchema,
} from './eventPaymentSchema.js';
import type {
   PaymentDecision,
   PaymentQueue,
   PaymentReject,
   PaymentSettings,
   SessionUser,
} from './eventPaymentTypes.js';

const mapProof = (proof: {
   id: string;
   status: string;
   submittedAt: Date;
   reviewedAt: Date | null;
   reviewReason: string | null;
   upload: {
      id: string;
      originalFilename: string;
      mediaType: string;
      sizeBytes: number;
      sha256: string;
   } | null;
}) => ({
   ...proof,
   submittedAt: proof.submittedAt.toISOString(),
   reviewedAt: proof.reviewedAt?.toISOString() ?? null,
   contentPath: `/api/private/payment-proofs/${proof.id}/content`,
});

const mapHistory = (history: { createdAt: Date }[]) =>
   history.map((item) => ({
      ...item,
      createdAt: item.createdAt.toISOString(),
   }));

class EventPaymentService {
   private async authorizeSubEvent(
      subEventId: string,
      user: SessionUser,
      steering = false,
   ) {
      const scope = await eventPaymentRepository.getSubEventScope(subEventId);
      if (!scope)
         throw new AppError('Sub-event not found', 404, 'SUB_EVENT_NOT_FOUND');
      if (steering)
         await eventCommitteeService.assertEventSteeringCommitteeMemberOrAdmin(
            scope.eventId,
            user,
         );
      else
         await eventCommitteeService.assertEventCommitteeMemberOrAdmin(
            scope.eventId,
            user,
         );
      return scope;
   }

   async getSettings(subEventId: string, user: SessionUser) {
      await this.authorizeSubEvent(subEventId, user);
      const row = await eventPaymentRepository.getSettings(subEventId);
      if (!row)
         throw new AppError('Sub-event not found', 404, 'SUB_EVENT_NOT_FOUND');
      return {
         amountMinor: row.paymentAmountMinor.toString(),
         currency: row.paymentCurrency,
         bankName: row.paymentBankName,
         accountHolder: row.paymentAccountHolder,
         accountNumber: row.paymentAccountNumberCanonical,
         instructions: row.paymentInstructions,
         paymentDeadlineHours: row.paymentDeadlineHours,
         acceptedProofTypes: row.paymentProofTypes,
         maxProofBytes: row.paymentProofMaxBytes,
      };
   }

   async updateSettings(
      subEventId: string,
      user: SessionUser,
      payload: PaymentSettings,
   ) {
      await this.authorizeSubEvent(subEventId, user, true);
      const result = await eventPaymentRepository.updateSettings(
         subEventId,
         payload,
      );
      if (!result)
         throw new AppError('Sub-event not found', 404, 'SUB_EVENT_NOT_FOUND');
      return this.getSettings(subEventId, user);
   }

   async list(subEventId: string, user: SessionUser, query: PaymentQueue) {
      await this.authorizeSubEvent(subEventId, user);
      const result = await eventPaymentRepository.list(subEventId, query);
      return {
         data: result.data.map((payment) => ({
            id: payment.id,
            registrationOrderId: payment.registrationOrderId,
            status: payment.status,
            revision: payment.revision,
            currency: payment.currency,
            amountMinor: payment.amountMinor.toString(),
            submittedAt: payment.submittedAt?.toISOString() ?? null,
            expiresAt: payment.expiresAt?.toISOString() ?? null,
            createdAt: payment.createdAt.toISOString(),
            order: payment.order,
         })),
         meta: {
            page: query.page,
            limit: query.limit,
            totalRecords: result.total,
            totalPages: Math.ceil(result.total / query.limit),
         },
      };
   }

   async getMine(registrationId: string, user: SessionUser) {
      const payment = await eventPaymentRepository.findByRegistrationForOwner(
         registrationId,
         user.id,
      );
      if (!payment)
         throw new AppError('Payment not found', 404, 'PAYMENT_NOT_FOUND');
      const deadlineExpired = Boolean(
         payment.expiresAt && new Date() >= payment.expiresAt,
      );
      const canUploadProof =
         !deadlineExpired &&
         payment.order.status === 'PENDING_PAYMENT' &&
         (payment.status === 'UNPAID' || payment.status === 'REJECTED');
      return participantPaymentDetailSchema.parse({
         id: payment.id,
         registrationOrderId: payment.registrationOrderId,
         orderNumber: payment.order.orderNumber,
         orderStatus: payment.order.status,
         status: payment.status,
         revision: payment.revision,
         currency: payment.currency,
         amountMinor: payment.amountMinor.toString(),
         bankSnapshot: normalizePaymentBankSnapshot(payment.bankSnapshot),
         submittedAt: payment.submittedAt?.toISOString() ?? null,
         verifiedAt: payment.verifiedAt?.toISOString() ?? null,
         expiresAt: payment.expiresAt?.toISOString() ?? null,
         rejectionReason: payment.rejectionReason,
         canUploadProof,
         canReplaceProof: canUploadProof && payment.status === 'REJECTED',
         deadlineExpired,
         proofs: payment.proofs
            .filter((proof) => proof.upload !== null)
            .map(mapProof),
         history: mapHistory(payment.history),
      });
   }

   async getDetail(paymentId: string, user: SessionUser) {
      const payment = await eventPaymentRepository.findDetail(paymentId);
      if (!payment)
         throw new AppError('Payment not found', 404, 'PAYMENT_NOT_FOUND');
      await this.authorizeSubEvent(payment.order.subEventId, user);
      return internalPaymentDetailSchema.parse({
         id: payment.id,
         registrationOrderId: payment.registrationOrderId,
         status: payment.status,
         revision: payment.revision,
         currency: payment.currency,
         amountMinor: payment.amountMinor.toString(),
         bankSnapshot: normalizePaymentBankSnapshot(payment.bankSnapshot),
         submittedAt: payment.submittedAt?.toISOString() ?? null,
         verifiedAt: payment.verifiedAt?.toISOString() ?? null,
         expiresAt: payment.expiresAt?.toISOString() ?? null,
         rejectionReason: payment.rejectionReason,
         reviewedAt: payment.reviewedAt?.toISOString() ?? null,
         createdAt: payment.createdAt.toISOString(),
         order: payment.order,
         proofs: payment.proofs
            .filter((proof) => proof.upload !== null)
            .map(mapProof),
         history: mapHistory(payment.history),
      });
   }

   async uploadProof(
      paymentId: string,
      user: SessionUser,
      file?: Express.Multer.File,
   ) {
      if (!file || !file.buffer.length)
         throw new AppError(
            'Payment proof file is required',
            400,
            'PROOF_REQUIRED',
         );
      if (file.size > HARD_MAX_PROOF_BYTES)
         throw new AppError(
            'Payment proof exceeds 10 MiB',
            413,
            'PROOF_TOO_LARGE',
         );
      const payment = await eventPaymentRepository.findForOwner(
         paymentId,
         user.id,
      );
      if (!payment)
         throw new AppError('Payment not found', 404, 'PAYMENT_NOT_FOUND');
      const snapshot = normalizePaymentBankSnapshot(payment.bankSnapshot);
      const maxBytes = snapshot.maxProofBytes;
      if (file.size > maxBytes)
         throw new AppError(
            'Payment proof exceeds the configured limit',
            413,
            'PROOF_TOO_LARGE',
         );
      const detected = await fileTypeFromBuffer(file.buffer);
      const allowed = snapshot.acceptedProofTypes;
      if (
         !detected ||
         !(allowed as readonly string[]).includes(detected.mime) ||
         !(acceptedProofTypes as readonly string[]).includes(detected.mime) ||
         detected.mime !== file.mimetype
      )
         throw new AppError(
            'Payment proof content type is invalid',
            400,
            'PROOF_TYPE_INVALID',
         );
      const staged = await stagePrivateFile(file.buffer);
      try {
         await staged.commit();
         const result = await eventPaymentRepository.createProof({
            paymentId,
            ownerUserId: user.id,
            storageKey: staged.key,
            mediaType: detected.mime,
            originalFilename: file.originalname.slice(0, 255),
            sizeBytes: file.size,
            sha256: createHash('sha256').update(file.buffer).digest('hex'),
         });
         if (!result || 'lifecycleConflict' in result)
            throw new AppError(
               'Payment is not accepting a proof',
               409,
               'PAYMENT_LIFECYCLE_CONFLICT',
            );
         if ('conflict' in result)
            throw new AppError(
               'A submitted proof already exists',
               409,
               'PROOF_ALREADY_SUBMITTED',
            );
         return {
            paymentId,
            proofId: result.proof.id,
            status: 'PROOF_SUBMITTED' as const,
         };
      } catch (error) {
         await staged.discard();
         throw error;
      }
   }

   async review(
      paymentId: string,
      user: SessionUser,
      action: 'VERIFIED' | 'REJECTED',
      payload: PaymentDecision | PaymentReject,
   ) {
      const detail = await eventPaymentRepository.findDetail(paymentId);
      if (!detail)
         throw new AppError('Payment not found', 404, 'PAYMENT_NOT_FOUND');
      await this.authorizeSubEvent(detail.order.subEventId, user);
      const result = await eventPaymentRepository.review(
         paymentId,
         user.id,
         payload.revision,
         action,
         payload.reason,
      );
      if (!result)
         throw new AppError('Payment not found', 404, 'PAYMENT_NOT_FOUND');
      if ('conflict' in result)
         throw new AppError(
            'Payment revision or lifecycle changed',
            409,
            'PAYMENT_REVISION_CONFLICT',
         );
      return result;
   }

   async content(proofId: string, user: SessionUser) {
      const proof = await eventPaymentRepository.getProofFile(proofId);
      if (!proof?.upload || proof.upload.status !== 'AVAILABLE')
         throw new AppError('Proof not found', 404, 'PROOF_NOT_FOUND');
      const own = proof.payment.order.buyerUserId === user.id;
      if (!own) {
         const [review, view] = await Promise.all([
            eventPaymentRepository.hasPermission(
               user.id,
               'review_event_payments',
            ),
            eventPaymentRepository.hasPermission(
               user.id,
               'view_payment_proofs',
            ),
         ]);
         if (!review || !view)
            throw new AppError('Proof not found', 404, 'PROOF_NOT_FOUND');
         await eventCommitteeService.assertEventCommitteeMemberOrAdmin(
            proof.payment.order.eventId,
            user,
         );
      }
      return {
         stream: await openPrivateFile(proof.upload.storageKey),
         mediaType: proof.upload.mediaType,
         filename: proof.upload.originalFilename,
      };
   }
}

export const eventPaymentService = new EventPaymentService();
