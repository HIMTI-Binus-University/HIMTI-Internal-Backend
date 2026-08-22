import express from 'express';
import type { Request, Response, Router } from 'express';
import { registrationFormV1Routes } from '@/features/registration-forms/registrationFormRoutes.js';
import eventRegistrationRoutes from '@/features/event-registrations/eventRegistrationRoutes.js';
import eventPaymentRoutes from '@/features/event-payments/eventPaymentRoutes.js';
import postRegistrationFormRoutes from '@/features/post-registration-forms/postRegistrationFormRoutes.js';
import eventPackageRoutes from '@/features/event-packages/eventPackageRoutes.js';
import eventTicketRoutes from '@/features/event-tickets/eventTicketRoutes.js';

const router: Router = express.Router();

router.get('/health', (_req: Request, res: Response) => {
   res.status(200).json({
      status: 'ok',
      version: 'v1',
      timestamp: new Date().toISOString(),
   });
});
router.use('/registration-form', registrationFormV1Routes);
router.use('/', eventRegistrationRoutes);
router.use('/', eventPaymentRoutes);
router.use('/', postRegistrationFormRoutes);
router.use('/', eventPackageRoutes);
router.use('/', eventTicketRoutes);

export default router;
