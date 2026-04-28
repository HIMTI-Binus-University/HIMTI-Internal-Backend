import express from 'express';
import type { Router } from 'express';
import { getUsers, getUserById, updateUser } from './userController.js';
import { requireAuth } from '@/middleware/authMiddleware.js';
import { requirePermission } from '@/middleware/permissionMiddleware.js';
const router: Router = express.Router();

router.get('/users', requireAuth, requirePermission('manage_users'), getUsers);
router.get(
   '/user/:id',
   requireAuth,
   requirePermission('manage_users'),
   getUserById,
);
router.patch(
   '/user/:id',
   requireAuth,
   requirePermission('manage_users'),
   updateUser,
);

export default router;
