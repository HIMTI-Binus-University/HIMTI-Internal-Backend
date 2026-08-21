import express from 'express';
import type { Request, Response, Router } from 'express';
import { registrationFormV1Routes } from '@/features/registration-forms/registrationFormRoutes.js';
import eventRegistrationRoutes from '@/features/event-registrations/eventRegistrationRoutes.js';
import eventPaymentRoutes from '@/features/event-payments/eventPaymentRoutes.js';
import postRegistrationFormRoutes from '@/features/post-registration-forms/postRegistrationFormRoutes.js';

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

export default router;
