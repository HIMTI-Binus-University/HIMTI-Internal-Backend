import express from 'express';
import type { Router } from 'express';
import {
   exportUsers,
   getUsers,
   getUserById,
   getUserSummary,
   resendUserVerification,
   updateUser,
} from './userController.js';
import { requireAuth } from '@/middleware/authMiddleware.js';
import { requirePermission } from '@/middleware/permissionMiddleware.js';
const router: Router = express.Router();
const manageUsers = [requireAuth, requirePermission('manage_users')] as const;

router.get('/users', ...manageUsers, getUsers);
router.get('/users/summary', ...manageUsers, getUserSummary);
router.get('/users/export', ...manageUsers, exportUsers);
router.get('/user/:id', ...manageUsers, getUserById);
router.patch('/user/:id', ...manageUsers, updateUser);
router.post(
   '/user/:id/resend-verification',
   ...manageUsers,
   resendUserVerification,
);

export default router;
