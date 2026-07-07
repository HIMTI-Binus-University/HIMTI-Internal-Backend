import express from 'express';
import type { Router } from 'express';
import { requireAuth } from '@/middleware/authMiddleware.js';
import { requirePermission } from '@/middleware/permissionMiddleware.js';
import { createSubEvent } from './subEventController.js';

const router: Router = express.Router();

router.post(
   '/create-sub-event',
   requireAuth,
   requirePermission('manage_events'),
   createSubEvent,
);

export default router;
