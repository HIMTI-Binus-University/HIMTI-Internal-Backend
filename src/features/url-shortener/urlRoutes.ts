import express from 'express';
import type { Router, Response, Request } from 'express';
import {
   clickUrl,
   createUrl,
   deleteUrl,
   getUrlById,
   getUrls,
   updateUrl,
} from './urlController.js';
import { requireAuth } from '@/middleware/authMiddleware.js';
import { requirePermission } from '@/middleware/permissionMiddleware.js';

const router: Router = express.Router();

router.get('/urltest', (_req: Request, res: Response) => {
   res.json({ message: 'test oi' });
});

router.post(
   '/create-url',
   requireAuth,
   requirePermission('manage_urls'),
   createUrl,
);
router.get('/link/:shortCode', clickUrl);
router.put(
   '/update-url/:id',
   requireAuth,
   requirePermission('manage_urls'),
   updateUrl,
);
router.patch(
   '/delete/:id',
   requireAuth,
   requirePermission('manage_urls'),
   deleteUrl,
);
router.get('/get-list', requireAuth, requirePermission('manage_urls'), getUrls);
router.get(
   '/get-list/:id',
   requireAuth,
   requirePermission('manage_urls'),
   getUrlById,
);

export default router;
