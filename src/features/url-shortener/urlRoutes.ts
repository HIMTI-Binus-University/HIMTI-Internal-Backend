import express from 'express';
import type { Router } from 'express';
import {
   clickUrl,
   createUrl,
   deleteUrl,
   getUrlById,
   getUrls,
   updateUrl,
} from './urlController.js';
import { requireAuth } from '@/middleware/authMiddleware.js';
import { requirePermissionOrRole } from '@/middleware/permissionMiddleware.js';

const router: Router = express.Router();

router.post(
   '/create-url',
   requireAuth,
   requirePermissionOrRole('manage_urls', 'Admin'),
   createUrl,
);
router.get('/link/:shortCode', clickUrl);
router.put(
   '/update-url/:id',
   requireAuth,
   requirePermissionOrRole('manage_urls', 'Admin'),
   updateUrl,
);
router.patch(
   '/delete/:id',
   requireAuth,
   requirePermissionOrRole('manage_urls', 'Admin'),
   deleteUrl,
);
router.get(
   '/get-list',
   requireAuth,
   requirePermissionOrRole('manage_urls', 'Admin'),
   getUrls,
);
router.get(
   '/get-list/:id',
   requireAuth,
   requirePermissionOrRole('manage_urls', 'Admin'),
   getUrlById,
);

export default router;
