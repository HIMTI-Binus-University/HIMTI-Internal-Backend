import express from 'express';
import type { Router } from 'express';
import { requireAuth } from '@/middleware/authMiddleware.js';
import { requirePermission } from '@/middleware/permissionMiddleware.js';
import {
   createFormQuestionOption,
   createFormQuestion,
   createRegistrationForm,
   deleteFormQuestionOption,
   deleteFormQuestion,
   getRegistrationFormById,
   getRegistrationFormBySubEventId,
   reorderFormQuestions,
   updateFormQuestionOption,
   updateFormQuestion,
   updateRegistrationFormStatus,
} from './registrationFormController.js';

const router: Router = express.Router();

router.post(
   '/sub-event/:subEventId',
   requireAuth,
   requirePermission('manage_events'),
   createRegistrationForm,
);
router.get(
   '/sub-event/:subEventId',
   requireAuth,
   requirePermission('manage_events'),
   getRegistrationFormBySubEventId,
);
router.post(
   '/:id/question',
   requireAuth,
   requirePermission('manage_events'),
   createFormQuestion,
);
router.patch(
   '/:id/reorder-questions',
   requireAuth,
   requirePermission('manage_events'),
   reorderFormQuestions,
);
router.post(
   '/question/:id/option',
   requireAuth,
   requirePermission('manage_events'),
   createFormQuestionOption,
);
router.patch(
   '/question/:id',
   requireAuth,
   requirePermission('manage_events'),
   updateFormQuestion,
);
router.patch(
   '/question/delete/:id',
   requireAuth,
   requirePermission('manage_events'),
   deleteFormQuestion,
);
router.patch(
   '/option/:id',
   requireAuth,
   requirePermission('manage_events'),
   updateFormQuestionOption,
);
router.patch(
   '/option/delete/:id',
   requireAuth,
   requirePermission('manage_events'),
   deleteFormQuestionOption,
);
router.patch(
   '/:id/status',
   requireAuth,
   requirePermission('manage_events'),
   updateRegistrationFormStatus,
);
router.get(
   '/:id',
   requireAuth,
   requirePermission('manage_events'),
   getRegistrationFormById,
);

export default router;
