import express from 'express';
import type { Router } from 'express';
import { requireAuth } from '@/middleware/authMiddleware.js';
import { requirePermission } from '@/middleware/permissionMiddleware.js';
import {
   createStudyClub,
   getStudyClub,
   listStudyClubs,
   updateStudyClub,
} from './studyClubController.js';

const router: Router = express.Router();

router.use(requireAuth, requirePermission('manage_education'));
router.route('/').get(listStudyClubs).post(createStudyClub);
router.route('/:sessionId').get(getStudyClub).patch(updateStudyClub);

export default router;
