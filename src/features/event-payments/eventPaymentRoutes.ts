import express from 'express';
import multer from 'multer';
import type { Router } from 'express';
import { requireAuth } from '@/middleware/authMiddleware.js';
import { requirePermission } from '@/middleware/permissionMiddleware.js';
import { HARD_MAX_PROOF_BYTES } from './eventPaymentSchema.js';
import {
   getMyPayment,
   getPaymentDetail,
   getPaymentSettings,
   handlePaymentProofUploadError,
   listPayments,
   rejectPayment,
   streamProof,
   updatePaymentSettings,
   uploadPaymentProof,
   verifyPayment,
} from './eventPaymentController.js';

const router: Router = express.Router();
const upload = multer({
   storage: multer.memoryStorage(),
   limits: { files: 1, fileSize: HARD_MAX_PROOF_BYTES, fields: 0 },
});
const review = [
   requireAuth,
   requirePermission('review_event_payments'),
] as const;

router.get(
   '/internal/sub-events/:subEventId/payment-settings',
   ...review,
   getPaymentSettings,
);
router.put(
   '/internal/sub-events/:subEventId/payment-settings',
   ...review,
   updatePaymentSettings,
);
router.get(
   '/internal/sub-events/:subEventId/payments',
   ...review,
   listPayments,
);
router.get('/internal/event-payments/:id', ...review, getPaymentDetail);
router.post('/internal/event-payments/:id/verify', ...review, verifyPayment);
router.post('/internal/event-payments/:id/reject', ...review, rejectPayment);
router.get(
   '/me/event-registrations/:registrationId/payment',
   requireAuth,
   getMyPayment,
);
router.post(
   '/me/event-payments/:id/proof',
   requireAuth,
   upload.single('proof'),
   handlePaymentProofUploadError,
   uploadPaymentProof,
);
router.get('/private/payment-proofs/:id/content', requireAuth, streamProof);

export default router;
