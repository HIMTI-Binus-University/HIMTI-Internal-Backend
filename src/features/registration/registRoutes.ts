import express from 'express';
import type { Router } from 'express';
import { completeProfile } from './registController.js';
import { requireAuth } from '@/middleware/authMiddleware.js';

const router: Router = express.Router();

router.patch('/complete-profile', requireAuth, completeProfile);

export default router;
