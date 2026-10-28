import express from 'express';
import type { Router } from 'express';
import { requireAuth } from '@/middleware/authMiddleware.js';
import { requirePermission } from '@/middleware/permissionMiddleware.js';
import {
   createCourseGroup,
   createResponsi,
   deleteResponsi,
   getCourseGroup,
   getResponsi,
   listCourseGroups,
   listResponsiVersions,
   listResponsies,
   updateCourseGroup,
   updateResponsi,
} from './educationController.js';

const router: Router = express.Router();

// Education scope protection
router.use(
   '/internal/education',
   requireAuth,
   requirePermission('manage_education'),
);

// Course Groups
router
   .route('/internal/education/course-groups')
   .get(listCourseGroups)
   .post(createCourseGroup);

router
   .route('/internal/education/course-groups/:courseId')
   .get(getCourseGroup)
   .patch(updateCourseGroup);

// Responsi
router
   .route('/internal/education/responsi')
   .get(listResponsies)
   .post(createResponsi);

router
   .route('/internal/education/responsi/:responsiId')
   .get(getResponsi)
   .patch(updateResponsi)
   .delete(deleteResponsi);

router
   .route('/internal/education/responsi/:responsiId/versions')
   .get(listResponsiVersions);

export default router;
