import express from 'express';
import type { Router } from 'express';
import { requireAuth } from '@/middleware/authMiddleware.js';
import { requirePermission } from '@/middleware/permissionMiddleware.js';
import {
   createFormQuestionOption,
   createFormQuestion,
   deleteFormQuestionOption,
   deleteFormQuestion,
   reorderFormQuestions,
   updateFormQuestionOption,
   updateFormQuestion,
} from './registrationFormController.js';

const router: Router = express.Router();

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

export default router;
