import express from 'express';
import type { Router } from 'express';
import { requireAuth } from '@/middleware/authMiddleware.js';
import { requirePermission } from '@/middleware/permissionMiddleware.js';
import {
   createVideo,
   deleteVideo,
   getVideo,
   listVideos,
   updateVideo,
} from './videoController.js';
import {
   approveResponsi,
   assignResponsiEditors,
   createCourseGroup,
   createResponsi,
   deleteResponsi,
   getCourseGroup,
   getResponsi,
   listCourseGroups,
   listResponsiVersions,
   listResponsies,
   restoreResponsiVersion,
   updateCourseGroup,
   updateResponsi,
} from './educationController.js';

import { summaryPermissions } from './educationTypes.js';

const router: Router = express.Router();

// Education scope protection
router.use(
   '/internal/education/videos',
   requireAuth,
   requirePermission('manage_education'),
);
router.use('/internal/education/course-groups', requireAuth);
router.use(
   '/internal/education/responsi',
   requireAuth,
   requirePermission(
      summaryPermissions.legacy,
      ...Object.values(summaryPermissions),
   ),
);

router.route('/internal/education/videos').get(listVideos).post(createVideo);

router
   .route('/internal/education/videos/:videoId')
   .get(getVideo)
   .patch(updateVideo)
   .delete(deleteVideo);

// Course Groups
router
   .route('/internal/education/course-groups')
   .get(
      requirePermission(
         summaryPermissions.legacy,
         ...Object.values(summaryPermissions),
      ),
      listCourseGroups,
   )
   .post(requirePermission(summaryPermissions.legacy), createCourseGroup);

router
   .route('/internal/education/course-groups/:courseId')
   .get(
      requirePermission(
         summaryPermissions.legacy,
         ...Object.values(summaryPermissions),
      ),
      getCourseGroup,
   )
   .patch(requirePermission(summaryPermissions.legacy), updateCourseGroup);

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

router.post(
   '/internal/education/responsi/:responsiId/versions/:versionId/restore',
   restoreResponsiVersion,
);

router.post(
   '/internal/education/responsi/:responsiId/approve',
   approveResponsi,
);
router.put(
   '/internal/education/responsi/:responsiId/editors',
   assignResponsiEditors,
);

export default router;
