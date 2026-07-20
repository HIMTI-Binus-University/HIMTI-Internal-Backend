import { requireAuth } from '@/middleware/authMiddleware.js';
import express from 'express';
import {
   createPermission,
   deletePermission,
   getPermissions,
   updatePermission,
} from './permissionController.js';
import { requirePermission } from '@/middleware/permissionMiddleware.js';
import type { Router } from 'express';

const router: Router = express.Router();

router.post(
   '/permission',
   requireAuth,
   requirePermission('manage_permissions'),
   createPermission,
);

router.get(
   '/permission',
   requireAuth,
   requirePermission('manage_permissions'),
   getPermissions,
);

router.patch(
   '/permission/:id',
   requireAuth,
   requirePermission('manage_permissions'),
   updatePermission,
);

router.patch(
   '/permission/delete/:id',
   requireAuth,
   requirePermission('manage_permissions'),
   deletePermission,
);

export default router;
