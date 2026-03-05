import express from 'express';
import type { Router } from 'express';
import {
   completeProfile,
   getUserById,
   verifyOutlookEmail,
} from './registController.js';
import { requireAuth } from '@/middleware/authMiddleware.js';

const router: Router = express.Router();

router.patch('/complete-profile', requireAuth, completeProfile);
router.get('/verify-outlook', verifyOutlookEmail);
router.get('/me', requireAuth, getUserById);

export default router;
