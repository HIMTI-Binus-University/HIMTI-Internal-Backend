import express from 'express';
import type { Router } from 'express';
import { requireAuth } from '@/middleware/authMiddleware.js';
<<<<<<< Updated upstream
import { createEvent } from './eventController.js';

const router: Router = express.Router();

router.post('/create-event', requireAuth, createEvent);
=======
import { requirePermission } from '@/middleware/permissionMiddleware.js';
import {
   createEvent,
   deleteEvent,
   getEventById,
   getEvents,
   updateEvent,
} from './eventController.js';

const router: Router = express.Router();

router.get(
   '/get-list',
   requireAuth,
   requirePermission('manage_events'),
   getEvents,
);
router.get(
   '/get-list/:id',
   requireAuth,
   requirePermission('manage_events'),
   getEventById,
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
>>>>>>> Stashed changes

export default router;
