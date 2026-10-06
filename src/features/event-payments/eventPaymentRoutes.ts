import { Router } from 'express';
import { requireAuth } from '@/middleware/authMiddleware.js';
import { requirePermission } from '@/middleware/permissionMiddleware.js';
import { parsePaymentProof } from './eventPaymentUpload.js';
import {
   participantPayment,
   paymentQueue,
   internalPayment,
   internalRegistrationPayment,
   reviewPayment,
   uploadAcknowledgement,
   proofContent,
} from './eventPaymentController.js';

const router = Router();
router.get(
   '/me/event-registrations/:registrationId/payment',
   requireAuth,
   participantPayment,
);
router.post(
   '/me/event-payments/:paymentId/acknowledgement',
   requireAuth,
   parsePaymentProof,
   uploadAcknowledgement,
);
router.get(
   '/internal/events/:eventId/payments',
   requireAuth,
   requirePermission('review_event_payments'),
   paymentQueue,
);
router.get(
   '/internal/events/:eventId/registrations/:registrationId/payment',
   requireAuth,
   requirePermission('review_event_payments'),
   internalRegistrationPayment,
);
router.get(
   '/internal/event-payments/:paymentId',
   requireAuth,
   requirePermission('review_event_payments'),
   internalPayment,
);
for (const action of ['approve', 'request-correction', 'reject'] as const)
   router.post(
      `/internal/event-payments/:paymentId/${action}`,
      requireAuth,
      requirePermission('review_event_payments'),
      reviewPayment(action),
   );
router.get(
   '/private/payment-proofs/:proofId/content',
   requireAuth,
   proofContent,
);
export default router;
