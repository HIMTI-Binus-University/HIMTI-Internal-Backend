import express from 'express';
import type { Router } from 'express';
import { requireAuth } from '@/middleware/authMiddleware.js';
import { requirePermission } from '@/middleware/permissionMiddleware.js';
import { createVideo, deleteVideo, getVideo, listEducationSessions, listVideos, updateVideo } from './videoController.js';
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

// Education sessions and videos
router.get('/internal/education/sessions', listEducationSessions);
router.route('/internal/education/videos').get(listVideos).post(createVideo);
router.route('/internal/education/videos/:videoId').get(getVideo).patch(updateVideo).delete(deleteVideo);

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
