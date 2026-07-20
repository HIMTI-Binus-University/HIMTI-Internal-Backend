import express from 'express';
import type { Router } from 'express';
import {
   getRoles,
   getRoleById,
   createRole,
   updateRole,
   assignRoleToUser,
   removeRoleFromUser,
   assignPermissionToRole,
   removePermissionFromRole,
   deleteRole,
} from './roleController.js';
import { requireAuth } from '@/middleware/authMiddleware.js';
import { requirePermission } from '@/middleware/permissionMiddleware.js';

const router: Router = express.Router();

router.get('/roles', requireAuth, requirePermission('manage_roles'), getRoles);
router.get(
   '/role/:id',
   requireAuth,
   requirePermission('manage_roles'),
   getRoleById,
);
router.post(
   '/role',
   requireAuth,
   requirePermission('manage_roles'),
   createRole,
);
router.patch(
   '/role/:id',
   requireAuth,
   requirePermission('manage_roles'),
   updateRole,
);

router.post(
   '/role/assign-user',
   requireAuth,
   requirePermission('manage_roles'),
   assignRoleToUser,
);
router.delete(
   '/role/remove-user',
   requireAuth,
   requirePermission('manage_roles'),
   removeRoleFromUser,
);

router.post(
   '/role/assign-permission',
   requireAuth,
   requirePermission('manage_roles'),
   assignPermissionToRole,
);
router.delete(
   '/role/remove-permission',
   requireAuth,
   requirePermission('manage_roles'),
   removePermissionFromRole,
);

router.patch(
   '/role/delete/:id',
   requireAuth,
   requirePermission('manage_roles'),
   deleteRole,
);

export default router;
