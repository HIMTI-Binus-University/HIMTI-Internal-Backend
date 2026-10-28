import express from 'express';
import type { Router } from 'express';
import { requireAuth } from '@/middleware/authMiddleware.js';
import { requirePermission } from '@/middleware/permissionMiddleware.js';
import { listCourseGroups } from './educationController.js';

const router: Router = express.Router();

router.get(
   '/internal/education/course-groups',
   requireAuth,
   requirePermission('manage_education'),
   listCourseGroups,
);

export default router;
