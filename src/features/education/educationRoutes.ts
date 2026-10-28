import express from 'express';
import type { Router } from 'express';
import { requireAuth } from '@/middleware/authMiddleware.js';
import { requirePermission } from '@/middleware/permissionMiddleware.js';
import {
   createCourseGroup,
   getCourseGroup,
   listCourseGroups,
   updateCourseGroup,
} from './educationController.js';

const router: Router = express.Router();

router.use(
   '/internal/education/course-groups',
   requireAuth,
   requirePermission('manage_education'),
);

router
   .route('/internal/education/course-groups')
   .get(listCourseGroups)
   .post(createCourseGroup);

router
   .route('/internal/education/course-groups/:courseId')
   .get(getCourseGroup)
   .patch(updateCourseGroup);

export default router;
