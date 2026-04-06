import express from 'express';
import { Router } from 'express';
import urlRoutes from '@/features/url-shortener/urlRoutes.js';
import blasterRoutes from '@/features/email-blaster/blasterRoutes.js';
import registRoutes from '@/features/registration/registRoutes.js';
import eventRoutes from '@/features/events/eventRoutes.js';
import subEventRoutes from '@/features/sub-events/subEventRoutes.js';

const router: Router = express.Router();

router.use('/url', urlRoutes);
router.use('/email-blast', blasterRoutes);
router.use('/registration', registRoutes);
router.use('/event', eventRoutes);
router.use('/sub-event', subEventRoutes);

export default router;
