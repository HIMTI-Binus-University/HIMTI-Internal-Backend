import { Router } from 'express';
import {
   getPublicCatalog,
   getPublicSummary,
   publicEducationError,
} from './publicEducationController.js';
import { AppError } from '@/utils/appError.js';

const router = Router();
router.use((_req, res, next) => {
   res.set('Cache-Control', 'no-store');
   next();
});
router.get('/catalog', getPublicCatalog);
router.get('/summaries/:id', getPublicSummary);
router.use((_req, _res, next) => next(new AppError('Not found', 404)));
router.use(publicEducationError);

export default router;
