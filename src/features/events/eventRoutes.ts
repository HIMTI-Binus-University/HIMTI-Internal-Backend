import express from 'express';
import { requireAuth } from '@/middleware/authMiddleware.js';
import { requirePermission } from '@/middleware/permissionMiddleware.js';
import {
   addOrganizer,
   createEvent,
   getInternalEvent,
   getPublicEvent,
   getRegistrationSettings,
   listInternalEvents,
   listOrganizers,
   listPublicEvents,
   removeOrganizer,
   transitionEvent,
   updateEvent,
   updateOrganizer,
   updateRegistrationSettings,
} from './eventController.js';

const router = express.Router();
router.get('/events', listPublicEvents);
router.get('/events/:eventId', getPublicEvent);
router.use('/internal/events', requireAuth);
router
   .route('/internal/events')
   .get(requirePermission('manage_events'), listInternalEvents)
   .post(requirePermission('manage_events'), createEvent);
router
   .route('/internal/events/:eventId')
   .get(requirePermission('manage_events'), getInternalEvent)
   .patch(requirePermission('manage_events'), updateEvent);
router.post(
   '/internal/events/:eventId/publish',
   requirePermission('manage_events'),
   transitionEvent('PUBLISHED'),
);
router.post(
   '/internal/events/:eventId/close',
   requirePermission('manage_events'),
   transitionEvent('CLOSED'),
);
router.post(
   '/internal/events/:eventId/cancel',
   requirePermission('manage_events'),
   transitionEvent('CANCELLED'),
);
router
   .route('/internal/events/:eventId/organizers')
   .get(requirePermission('manage_events'), listOrganizers)
   .post(requirePermission('manage_events'), addOrganizer);
router
   .route('/internal/events/:eventId/organizers/:userId')
   .patch(requirePermission('manage_events'), updateOrganizer)
   .delete(requirePermission('manage_events'), removeOrganizer);
router
   .route('/internal/events/:eventId/registration-settings')
   .get(requirePermission('manage_event_registration'), getRegistrationSettings)
   .put(
      requirePermission('manage_event_registration'),
      updateRegistrationSettings,
   );
export default router;
