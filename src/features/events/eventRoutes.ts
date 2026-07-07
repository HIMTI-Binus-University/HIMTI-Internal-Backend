import express from 'express';
import type { Router } from 'express';
import { requireAuth } from '@/middleware/authMiddleware.js';
import { requirePermission } from '@/middleware/permissionMiddleware.js';
import { createEvent, getEvents } from './eventController.js';

const router: Router = express.Router();

router.get(
   '/get-list',
   requireAuth,
   requirePermission('manage_events'),
   getEvents,
);
router.post(
   '/create-event',
   requireAuth,
   requirePermission('manage_events'),
   createEvent,
);

export default router;
