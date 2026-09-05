import express from 'express';
import { requireAuth } from '@/middleware/authMiddleware.js';
import { requirePermission } from '@/middleware/permissionMiddleware.js';
import {
   addEventGroupOrganizer,
   createEventGroup,
   getInternalEventGroup,
   getPublicEventGroup,
   listEventGroupOrganizers,
   listInternalEventGroups,
   listPublicEventGroups,
   removeEventGroupOrganizer,
   transitionEventGroup,
   updateEventGroup,
   updateEventGroupOrganizer,
} from './eventGroupController.js';
const router = express.Router();
router.get('/event-groups', listPublicEventGroups);
router.get('/event-groups/:eventGroupId', getPublicEventGroup);
router.use(
   '/internal/event-groups',
   requireAuth,
   requirePermission('manage_event_groups'),
);
router
   .route('/internal/event-groups')
   .get(listInternalEventGroups)
   .post(createEventGroup);
router
   .route('/internal/event-groups/:eventGroupId')
   .get(getInternalEventGroup)
   .patch(updateEventGroup);
router.post(
   '/internal/event-groups/:eventGroupId/publish',
   transitionEventGroup('PUBLISHED'),
);
router.post(
   '/internal/event-groups/:eventGroupId/archive',
   transitionEventGroup('ARCHIVED'),
);
router
   .route('/internal/event-groups/:eventGroupId/organizers')
   .get(listEventGroupOrganizers)
   .post(addEventGroupOrganizer);
router
   .route('/internal/event-groups/:eventGroupId/organizers/:userId')
   .patch(updateEventGroupOrganizer)
   .delete(removeEventGroupOrganizer);
export default router;
