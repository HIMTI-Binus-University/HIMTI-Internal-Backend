import express from 'express';
import type { Router } from 'express';
import { requireAuth } from '@/middleware/authMiddleware.js';
import { requirePermission } from '@/middleware/permissionMiddleware.js';
import {
   assignEventCommittee,
   getEventCommittee,
   removeEventCommittee,
   updateEventCommittee,
} from './eventCommitteeController.js';

const router: Router = express.Router();

router.get(
   '/event/:eventId',
   requireAuth,
   requirePermission('manage_events'),
   getEventCommittee,
);
router.post(
   '/',
   requireAuth,
   requirePermission('manage_events'),
   assignEventCommittee,
);
router.patch(
   '/',
   requireAuth,
   requirePermission('manage_events'),
   updateEventCommittee,
);
router.delete(
   '/',
   requireAuth,
   requirePermission('manage_events'),
   removeEventCommittee,
);

export default router;
