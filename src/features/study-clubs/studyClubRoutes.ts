import express from 'express';
import type { Router } from 'express';
import { requireAuth } from '@/middleware/authMiddleware.js';
import { requirePermission } from '@/middleware/permissionMiddleware.js';
import {
   createStudyClub,
   getStudyClub,
   listStudyClubs,
   listPublicStudyClubs,
   updateStudyClub,
} from './studyClubController.js';

const router: Router = express.Router();

router.use(requireAuth, requirePermission('manage_education'));
router.route('/').get(listStudyClubs).post(createStudyClub);
router.route('/:sessionId').get(getStudyClub).patch(updateStudyClub);

export const publicStudyClubRoutes: Router = express.Router();
publicStudyClubRoutes.get('/public/education/sessions', listPublicStudyClubs);

export default router;
