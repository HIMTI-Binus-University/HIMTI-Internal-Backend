import express from 'express';
import type { Router } from 'express';
import { requireAuth } from '@/middleware/authMiddleware.js';
import { requirePermission } from '@/middleware/permissionMiddleware.js';
import {
   createSubEvent,
   deleteSubEvent,
   getSubEventById,
   getSubEvents,
   updateSubEvent,
} from './subEventController.js';

const router: Router = express.Router();

router.get(
   '/get-list',
   requireAuth,
   requirePermission('manage_events'),
   getSubEvents,
);
router.get(
   '/get-list/:id',
   requireAuth,
   requirePermission('manage_events'),
   getSubEventById,
);
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
