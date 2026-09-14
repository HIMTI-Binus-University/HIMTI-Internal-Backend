import { Router } from 'express';
import multer from 'multer';
import { requireAuth } from '@/middleware/authMiddleware.js';
import { requirePermission } from '@/middleware/permissionMiddleware.js';
import { PAYMENT_PROOF_MAX_BYTES } from '@/features/events/eventService.js';
import { AppError } from '@/utils/appError.js';
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
const upload = multer({
   storage: multer.memoryStorage(),
   limits: { fileSize: PAYMENT_PROOF_MAX_BYTES, files: 1, fields: 1 },
});
const uploadError = (error: multer.MulterError) => {
   if (error.code === 'LIMIT_FILE_SIZE')
      return new AppError('Payment proof must be 1.5 MB or smaller', 413);
   if (error.code === 'LIMIT_FILE_COUNT')
      return new AppError('Upload exactly one payment proof file', 400);
   if (error.code === 'LIMIT_FIELD_COUNT')
      return new AppError('Payment proof upload contains too many fields', 400);
   if (error.code === 'LIMIT_UNEXPECTED_FILE')
      return new AppError(
         'Payment proof must be uploaded using the file field',
         400,
      );
   return new AppError('Payment proof upload could not be processed', 400);
};
router.get(
   '/me/event-registrations/:registrationId/payment',
   requireAuth,
   participantPayment,
);
router.post(
   '/me/event-payments/:paymentId/acknowledgement',
   requireAuth,
   (req, res, next) => {
      upload.single('file')(req, res, (error: unknown) => {
         if (error instanceof multer.MulterError)
            return next(uploadError(error));
         next(error);
      });
   },
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
