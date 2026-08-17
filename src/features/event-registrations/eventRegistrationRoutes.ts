import express from 'express';
import type { Router } from 'express';
import { requireAuth } from '@/middleware/authMiddleware.js';
import {
   cancelRegistration,
   createRegistration,
   getMyRegistration,
   getPublicEvent,
   getRegistrationContext,
   listMyRegistrations,
   listPublicEvents,
   replaceRegistrationResponses,
   submitRegistration,
   listInternalRegistrations,
   getInternalRegistrationCapacity,
   getInternalRegistration,
   getInternalQueueNeighbors,
   approveInternalRegistration,
   rejectInternalRegistration,
   requestRegistrationCorrection,
   adminCancelInternalRegistration,
   bulkApproveInternalRegistrations,
   bulkRejectInternalRegistrations,
   bulkCancelInternalRegistrations,
} from './eventRegistrationController.js';
import { requirePermission } from '@/middleware/permissionMiddleware.js';

const router: Router = express.Router();

router.get('/events', listPublicEvents);
router.get('/events/:eventId', getPublicEvent);
router.get(
   '/sub-events/:subEventId/registration-context',
   getRegistrationContext,
);
router.post(
   '/sub-events/:subEventId/registrations',
   requireAuth,
   createRegistration,
);

const reviewMiddleware = [
   requireAuth,
   requirePermission('review_event_registrations'),
] as const;
router.get(
   '/internal/sub-events/:subEventId/registrations',
   ...reviewMiddleware,
   listInternalRegistrations,
);
router.get(
   '/internal/sub-events/:subEventId/registrations/capacity',
   ...reviewMiddleware,
   getInternalRegistrationCapacity,
);
router.get(
   '/internal/event-registrations/:registrationId',
   ...reviewMiddleware,
   getInternalRegistration,
);
router.get(
   '/internal/sub-events/:subEventId/registrations/:registrationId/neighbors',
   ...reviewMiddleware,
   getInternalQueueNeighbors,
);
router.post(
   '/internal/event-registrations/:registrationId/approve',
   ...reviewMiddleware,
   approveInternalRegistration,
);
router.post(
   '/internal/event-registrations/:registrationId/reject',
   ...reviewMiddleware,
   rejectInternalRegistration,
);
router.post(
   '/internal/event-registrations/:registrationId/request-correction',
   ...reviewMiddleware,
   requestRegistrationCorrection,
);
router.post(
   '/internal/event-registrations/:registrationId/admin-cancel',
   ...reviewMiddleware,
   adminCancelInternalRegistration,
);
router.post(
   '/internal/sub-events/:subEventId/registrations/bulk-approve',
   ...reviewMiddleware,
   bulkApproveInternalRegistrations,
);
router.post(
   '/internal/sub-events/:subEventId/registrations/bulk-reject',
   ...reviewMiddleware,
   bulkRejectInternalRegistrations,
);
router.post(
   '/internal/sub-events/:subEventId/registrations/bulk-cancel',
   ...reviewMiddleware,
   bulkCancelInternalRegistrations,
);
router.get('/me/event-registrations', requireAuth, listMyRegistrations);
router.get(
   '/me/event-registrations/:registrationId',
   requireAuth,
   getMyRegistration,
);
router.put(
   '/me/event-registrations/:registrationId/response',
   requireAuth,
   replaceRegistrationResponses,
);
router.post(
   '/me/event-registrations/:registrationId/submit',
   requireAuth,
   submitRegistration,
);
router.post(
   '/me/event-registrations/:registrationId/cancel',
   requireAuth,
   cancelRegistration,
);

export default router;
