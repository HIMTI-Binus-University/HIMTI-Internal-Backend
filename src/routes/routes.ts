import express from 'express';
import { Router } from 'express';
import urlRoutes from '@/features/url-shortener/urlRoutes.js';
import blasterRoutes from '@/features/email-blaster/blasterRoutes.js';

const router: Router = express.Router();

router.use('/url', urlRoutes);
router.use('/email-blast', blasterRoutes);

export default router;
