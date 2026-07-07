import express from 'express';
import type { Router } from 'express';
import { requireAuth } from '@/middleware/authMiddleware.js';
import { requirePermission } from '@/middleware/permissionMiddleware.js';
import {
   createFormQuestion,
   deleteFormQuestion,
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

export default router;
