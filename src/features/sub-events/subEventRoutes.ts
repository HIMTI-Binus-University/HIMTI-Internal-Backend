import express from 'express';
import type { Router } from 'express';
import { requireAuth } from '@/middleware/authMiddleware.js';
import { requirePermission } from '@/middleware/permissionMiddleware.js';
import {
   createSubEvent,
   deleteSubEvent,
   updateSubEvent,
} from './subEventController.js';

const router: Router = express.Router();

router.post(
   '/create-sub-event',
   requireAuth,
   requirePermission('manage_events'),
   createSubEvent,
);
router.patch(
   '/update-sub-event/:id',
   requireAuth,
   requirePermission('manage_events'),
   updateSubEvent,
);
router.patch(
   '/delete/:id',
   requireAuth,
   requirePermission('manage_events'),
   deleteSubEvent,
);

export default router;
