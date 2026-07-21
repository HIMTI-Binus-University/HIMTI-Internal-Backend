import express from 'express';
import type { Router } from 'express';
import { requireAuth } from '@/middleware/authMiddleware.js';
import { requirePermission } from '@/middleware/permissionMiddleware.js';
import {
   activatePeriod,
   createPeriod,
   createResource,
   deletePeriod,
   deleteResource,
   getMembershipResources,
   getMembershipStatus,
   listPeriods,
   listResources,
   reorderResources,
   setRegistrationOpen,
   updatePeriod,
   updateResource,
} from './membershipController.js';

const router: Router = express.Router();
const manage = [requireAuth, requirePermission('manage_batch')] as const;

router.get('/status', requireAuth, getMembershipStatus);
router.get('/resources', requireAuth, getMembershipResources);
router.get('/periods', ...manage, listPeriods);
router.post('/periods', ...manage, createPeriod);
router.patch('/periods/:periodId', ...manage, updatePeriod);
router.delete('/periods/:periodId', ...manage, deletePeriod);
router.post('/periods/:periodId/activate', ...manage, activatePeriod);
router.patch(
   '/periods/:periodId/reregistration',
   ...manage,
   setRegistrationOpen,
);
router.get('/periods/:periodId/resources', ...manage, listResources);
router.post('/periods/:periodId/resources', ...manage, createResource);
router.put('/periods/:periodId/resources/order', ...manage, reorderResources);
router.patch('/resources/:resourceId', ...manage, updateResource);
router.delete('/resources/:resourceId', ...manage, deleteResource);

export default router;
