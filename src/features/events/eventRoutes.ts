import express from 'express';
import type { Router } from 'express';
import { requireAuth } from '@/middleware/authMiddleware.js';
import { requirePermission } from '@/middleware/permissionMiddleware.js';
import {
   createEvent,
   deleteEvent,
   getEvents,
   getPublishedEventById,
   getPublishedEvents,
   reorderSubEvents,
   updateEvent,
} from './eventController.js';

const router: Router = express.Router();

router.get('/published', requireAuth, getPublishedEvents);
router.get('/published/:id', requireAuth, getPublishedEventById);

router.put(
   '/:id/sub-events/order',
   requireAuth,
   requirePermission('manage_events'),
   reorderSubEvents,
);

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
router.patch(
   '/update-event/:id',
   requireAuth,
   requirePermission('manage_events'),
   updateEvent,
);
router.patch(
   '/delete/:id',
   requireAuth,
   requirePermission('manage_events'),
   deleteEvent,
);

export default router;
