import express from 'express';
import type { Request, Response, Router } from 'express';
import urlRoutes from '@/features/url-shortener/urlRoutes.js';
import eventRoutes from '@/features/events/eventRoutes.js';
import eventCommitteeRoutes from '@/features/event-committee/eventCommitteeRoutes.js';
import subEventRoutes from '@/features/sub-events/subEventRoutes.js';
import registrationFormRoutes from '@/features/registration-forms/registrationFormRoutes.js';
import permissionRoutes from '@/features/permissions/permissionRoutes.js';
import userRoutes from '@/features/users/userRoutes.js';
import roleRoutes from '@/features/roles/roleRoutes.js';

const router: Router = express.Router();

router.get('/health', (_req: Request, res: Response) => {
   res.status(200).json({
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
   });
});

router.use('/url', urlRoutes);
router.use('/event', eventRoutes);
router.use('/event-committee', eventCommitteeRoutes);
router.use('/sub-event', subEventRoutes);
router.use('/registration-form', registrationFormRoutes);
router.use('/', permissionRoutes);
router.use('/', userRoutes);
router.use('/', roleRoutes);

export default router;
