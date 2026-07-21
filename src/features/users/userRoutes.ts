import express from 'express';
import type { Router } from 'express';
import {
   completeProfile,
   getCurrentUser,
   getRegistrationOptions,
   getUsers,
   getUserById,
   sendOutlookVerification,
   updateProfile,
   updateUser,
   verifyOutlookEmail,
} from './userController.js';
import { requireAuth } from '@/middleware/authMiddleware.js';
import { requirePermission } from '@/middleware/permissionMiddleware.js';
const router: Router = express.Router();

router.get('/users', requireAuth, requirePermission('manage_users'), getUsers);
router.get('/user/me', requireAuth, getCurrentUser);
router.patch('/user/me', requireAuth, updateProfile);
router.patch('/user/me/complete-profile', requireAuth, completeProfile);
router.get('/user/registration-options', requireAuth, getRegistrationOptions);
router.post(
   '/user/me/binus-email/send-verification',
   requireAuth,
   sendOutlookVerification,
);
router.get('/user/binus-email/verify', verifyOutlookEmail);
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
