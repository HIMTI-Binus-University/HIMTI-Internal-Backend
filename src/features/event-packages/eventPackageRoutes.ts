import express from 'express';
import type { Router } from 'express';
import { requireAuth } from '@/middleware/authMiddleware.js';
import { requirePermission } from '@/middleware/permissionMiddleware.js';
import {
   createEventPackage,
   listEventPackages,
   updateEventPackage,
} from './eventPackageController.js';

const router: Router = express.Router();
const manage = [requireAuth, requirePermission('manage_events')] as const;

router.get(
   '/internal/sub-events/:subEventId/packages',
   ...manage,
   listEventPackages,
);
router.post(
   '/internal/sub-events/:subEventId/packages',
   ...manage,
   createEventPackage,
);
router.put(
   '/internal/event-packages/:packageId',
   ...manage,
   updateEventPackage,
);

export default router;
