import express from 'express';
import type { Router } from 'express';
import {
   completeProfile,
   exportUsers,
   getCurrentUser,
   getRegistrationOptions,
   getUsers,
   getUserSummary,
   getUserById,
   sendOutlookVerification,
   resendUserVerification,
   reregister,
   updateProfile,
   updateUser,
   verifyOutlookEmail,
} from './userController.js';
import { requireAuth } from '@/middleware/authMiddleware.js';
import { requirePermission } from '@/middleware/permissionMiddleware.js';
const router: Router = express.Router();

router.get('/users', requireAuth, requirePermission('manage_users'), getUsers);
router.get(
   '/users/summary',
   requireAuth,
   requirePermission('manage_users'),
   getUserSummary,
);
router.get(
   '/users/export',
   requireAuth,
   requirePermission('manage_users'),
   exportUsers,
);
router.get('/user/me', requireAuth, getCurrentUser);
router.patch('/user/me', requireAuth, updateProfile);
router.patch('/user/me/complete-profile', requireAuth, completeProfile);
router.patch('/user/me/reregister', requireAuth, reregister);
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
router.post(
   '/user/:id/resend-verification',
   requireAuth,
   requirePermission('manage_users'),
   resendUserVerification,
);

export default router;
