import express from 'express';
import type { Router } from 'express';
import {
   completeProfile,
   getUserById,
   verifyOutlookEmail,
   sendVerification,
   getOptions,
} from './registController.js';
import { requireAuth } from '@/middleware/authMiddleware.js';
import rateLimit from 'express-rate-limit';

const router: Router = express.Router();
const verificationLimiter = rateLimit({
   windowMs: 15 * 60 * 1000,
   limit: 5,
   standardHeaders: true,
   legacyHeaders: false,
});

router.patch('/complete-profile', requireAuth, completeProfile);
router.get('/verify-outlook', verifyOutlookEmail);
router.post(
   '/binus-email/send-verification',
   requireAuth,
   verificationLimiter,
   sendVerification,
);
router.post('/send-verification', requireAuth, verificationLimiter, sendVerification);
router.get('/options', getOptions);
router.get('/me', requireAuth, getUserById);

export default router;
