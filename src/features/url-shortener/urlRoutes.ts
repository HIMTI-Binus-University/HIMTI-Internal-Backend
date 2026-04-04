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
// import { requireAuth } from '@/middleware/authMiddleware.js';

const router: Router = express.Router();

router.get('/urltest', (_req: Request, res: Response) => {
   res.json({ message: 'test oi' });
});

router.post(
   '/create-url',
   // requireAuth,
   // requirePermission('create.url'),
   createUrl,
);
router.get('/link/:shortCode', clickUrl);
router.put('/update-url/:id', requireAuth, updateUrl);
router.patch('/delete/:id', requireAuth, deleteUrl);
router.get('/get-list', requireAuth, getUrls);
router.get('/get-list/:id', requireAuth, getUrlById);

export default router;
