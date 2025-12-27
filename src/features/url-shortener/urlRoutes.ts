import express from 'express';
import type { Router, Response, Request } from 'express';
import { createUrl, getUrlById, getUrls, updateUrl } from './urlController.js';
import { requireAuth } from '@/middleware/authMiddleware.js';
import { requirePermission } from '@/middleware/permissionMiddleware.js';

const router: Router = express.Router();

router.get('/urltest', (_req: Request, res: Response) => {
   res.json({ message: 'test oi' });
});

router.post(
   '/create-url',
   requireAuth,
   requirePermission('create.url'),
   createUrl,
);
router.put('/update-url/:id', requireAuth, updateUrl);
router.get('/get-list', requireAuth, getUrls);
router.get('/get-list/:shortCode', getUrlById);

export default router;
