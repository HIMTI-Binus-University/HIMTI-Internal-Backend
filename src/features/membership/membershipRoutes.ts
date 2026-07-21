import express from 'express';
import type { Router } from 'express';
import { requireAuth } from '@/middleware/authMiddleware.js';
import { getMembershipResources } from './membershipController.js';

const router: Router = express.Router();

router.get('/resources', requireAuth, getMembershipResources);

export default router;
