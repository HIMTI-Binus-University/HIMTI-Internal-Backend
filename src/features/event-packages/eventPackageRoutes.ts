import express from 'express';
import { requireAuth } from '@/middleware/authMiddleware.js';
import { requirePermission } from '@/middleware/permissionMiddleware.js';
import {
   createEventPackage,
   getEventPackage,
   listEventPackages,
   setEventPackageStatus,
   updateEventPackage,
} from './eventPackageController.js';

const router = express.Router();
router.use(requireAuth, requirePermission('manage_event_packages'));
router
   .route('/internal/events/:eventId/packages')
   .get(listEventPackages)
   .post(createEventPackage);
router
   .route('/internal/events/:eventId/packages/:packageId')
   .get(getEventPackage)
   .patch(updateEventPackage);
router.post(
   '/internal/events/:eventId/packages/:packageId/activate',
   setEventPackageStatus(true),
);
router.post(
   '/internal/events/:eventId/packages/:packageId/deactivate',
   setEventPackageStatus(false),
);
export default router;
