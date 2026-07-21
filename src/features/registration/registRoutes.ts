import express from 'express';
import type { Router } from 'express';
import {
   completeProfile,
   getUserById,
   verifyOutlookEmail,
   getRegistrationOptions,
   sendOutlookVerification,
   updateProfile,
} from './registController.js';
import { requireAuth } from '@/middleware/authMiddleware.js';

const router: Router = express.Router();

router.patch('/complete-profile', requireAuth, completeProfile);
router.patch('/profile', requireAuth, updateProfile);
router.get('/options', requireAuth, getRegistrationOptions);
router.post('/binus-email/send-verification', requireAuth, sendOutlookVerification);
router.get('/verify-outlook', verifyOutlookEmail);
router.get('/me', requireAuth, getUserById);

export default router;
