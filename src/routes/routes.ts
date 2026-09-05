import express from 'express';
import type { Request, Response, Router } from 'express';
import urlRoutes from '@/features/url-shortener/urlRoutes.js';
import eventRoutes from '@/features/events/eventRoutes.js';
import eventGroupRoutes from '@/features/event-groups/eventGroupRoutes.js';
import eventPackageRoutes from '@/features/event-packages/eventPackageRoutes.js';
import registrationFormRoutes from '@/features/registration-forms/registrationFormRoutes.js';
import permissionRoutes from '@/features/permissions/permissionRoutes.js';
import userRoutes from '@/features/users/userRoutes.js';
import roleRoutes from '@/features/roles/roleRoutes.js';
import membershipRoutes from '@/features/membership/membershipRoutes.js';
import linkWorkspaceRoutes from '@/features/link-workspaces/linkWorkspaceRoutes.js';
import {
   electionRouter,
   internalElectionRouter,
} from '@/features/elections/electionRoutes.js';

const router: Router = express.Router();

router.get('/health', (_req: Request, res: Response) => {
   res.status(200).json({
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
   });
});

router.use('/url', urlRoutes);
router.use('/link-workspaces', linkWorkspaceRoutes);
router.use('/membership', membershipRoutes);
router.use('/elections', electionRouter);
router.use('/internal/elections', internalElectionRouter);
router.use('/', eventRoutes);
router.use('/', eventGroupRoutes);
router.use('/', eventPackageRoutes);
router.use('/', registrationFormRoutes);
router.use('/', permissionRoutes);
router.use('/', userRoutes);
router.use('/', roleRoutes);

export default router;
