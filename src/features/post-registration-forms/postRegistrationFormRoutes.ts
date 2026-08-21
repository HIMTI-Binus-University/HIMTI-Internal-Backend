import express from 'express';
import type { Router } from 'express';
import { requireAuth } from '@/middleware/authMiddleware.js';
import { requirePermission } from '@/middleware/permissionMiddleware.js';
import {
   getInternalPostRegistrationAssignment,
   getMyPostRegistrationAssignment,
   listInternalPostRegistrationAssignments,
   listMyPostRegistrationAssignments,
   reopenPostRegistrationAssignment,
   requestPostRegistrationCorrection,
   saveMyPostRegistrationResponse,
   submitMyPostRegistrationResponse,
} from './postRegistrationFormController.js';

const router: Router = express.Router();
router.get(
   '/me/event-registrations/:registrationId/post-registration-assignments',
   requireAuth,
   listMyPostRegistrationAssignments,
);
router.get(
   '/me/event-registrations/:registrationId/post-registration-assignments/:assignmentId',
   requireAuth,
   getMyPostRegistrationAssignment,
);
router.put(
   '/me/event-registrations/:registrationId/post-registration-assignments/:assignmentId/response',
   requireAuth,
   saveMyPostRegistrationResponse,
);
router.post(
   '/me/event-registrations/:registrationId/post-registration-assignments/:assignmentId/submit',
   requireAuth,
   submitMyPostRegistrationResponse,
);
const review = [
   requireAuth,
   requirePermission('review_event_registrations'),
] as const;
router.get(
   '/internal/sub-events/:subEventId/post-registration-assignments',
   ...review,
   listInternalPostRegistrationAssignments,
);
router.get(
   '/internal/post-registration-assignments/:assignmentId',
   ...review,
   getInternalPostRegistrationAssignment,
);
router.post(
   '/internal/post-registration-assignments/:assignmentId/request-correction',
   ...review,
   requestPostRegistrationCorrection,
);
router.post(
   '/internal/post-registration-assignments/:assignmentId/reopen',
   ...review,
   reopenPostRegistrationAssignment,
);
export default router;
