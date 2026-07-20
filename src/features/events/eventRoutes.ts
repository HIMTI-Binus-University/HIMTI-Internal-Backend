import express from 'express';
import type { Router } from 'express';
import { requireAuth } from '@/middleware/authMiddleware.js';
import { createEvent } from './eventController.js';

const router: Router = express.Router();

router.post('/create-event', requireAuth, createEvent);

export default router;
