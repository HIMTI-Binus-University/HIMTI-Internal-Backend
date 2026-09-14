import express from 'express';
import rateLimit from 'express-rate-limit';
import { requireAuth } from '@/middleware/authMiddleware.js';
import { requirePermission } from '@/middleware/permissionMiddleware.js';
import {
   cancelMyEventRegistration,
   createEventBundle,
   joinEventBundle,
   leaveMyBundle,
   listInternalBundles,
   listInternalRegistrations,
   getInternalRegistration,
   removeBundleMember,
   replaceMyBundleCode,
   saveSupplementalAnswers,
   supplementalTracking,
   createEventRegistration,
   getMyEventRegistration,
   getRegistrationContext,
   listMyEventRegistrations,
   replaceMyEventRegistrationAnswers,
} from './eventRegistrationController.js';

const router = express.Router();
const bundleJoinLimiter = rateLimit({
   windowMs: 10 * 60 * 1000,
   limit: 20,
   standardHeaders: 'draft-7',
   legacyHeaders: false,
   message: { msg: 'Bundle Code is invalid or the Bundle is unavailable' },
});
const bundleJoinUserLimiter = rateLimit({
   windowMs: 10 * 60 * 1000,
   limit: 20,
   keyGenerator: (req) => req.res!.locals.user.id,
   standardHeaders: 'draft-7',
   legacyHeaders: false,
   message: { msg: 'Bundle Code is invalid or the Bundle is unavailable' },
});
router.put(
   '/me/event-registrations/:registrationId/additional-answers',
   requireAuth,
   saveSupplementalAnswers,
);
router.get(
   '/internal/events/:eventId/registrations/outstanding-answers',
   requireAuth,
   requirePermission('manage_event_registration_form'),
   supplementalTracking,
);
router.get('/events/:eventId/registration-context', getRegistrationContext);
router.post(
   '/events/:eventId/registrations',
   requireAuth,
   createEventRegistration,
);
router.post('/events/:eventId/bundles', requireAuth, createEventBundle);
router.post(
   '/events/:eventId/bundles/join',
   requireAuth,
   bundleJoinLimiter,
   bundleJoinUserLimiter,
   joinEventBundle,
);
router.get('/me/event-registrations', requireAuth, listMyEventRegistrations);
router.get(
   '/me/event-registrations/:registrationId',
   requireAuth,
   getMyEventRegistration,
);
router.put(
   '/me/event-registrations/:registrationId/answers',
   requireAuth,
   replaceMyEventRegistrationAnswers,
);
router.post(
   '/me/event-registrations/:registrationId/cancel',
   requireAuth,
   cancelMyEventRegistration,
);
router.post(
   '/me/event-registrations/:registrationId/leave',
   requireAuth,
   leaveMyBundle,
);
router.post(
   '/me/event-registrations/:registrationId/bundle-code/replace',
   requireAuth,
   replaceMyBundleCode,
);
router.get(
   '/internal/events/:eventId/registrations',
   requireAuth,
   requirePermission('review_event_registrations'),
   listInternalRegistrations,
);
router.get(
   '/internal/events/:eventId/registrations/bundles',
   requireAuth,
   requirePermission('review_event_registrations'),
   listInternalBundles,
);
router.get(
   '/internal/events/:eventId/registrations/:registrationId',
   requireAuth,
   requirePermission('review_event_registrations'),
   getInternalRegistration,
);
router.delete(
   '/internal/events/:eventId/registrations/:registrationId/members/:userId',
   requireAuth,
   requirePermission('review_event_registrations'),
   removeBundleMember,
);

export default router;
