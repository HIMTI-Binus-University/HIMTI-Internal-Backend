import express from 'express';
import { requireAuth } from '@/middleware/authMiddleware.js';
import { requirePermission } from '@/middleware/permissionMiddleware.js';
import {
   closeRegistrationForm,
   duplicateRegistrationForm,
   getRegistrationForm,
   previewRegistrationForm,
   publishRegistrationForm,
   putRegistrationForm,
   validateRegistrationForm,
} from './registrationFormController.js';

const router = express.Router();
router.use(requireAuth, requirePermission('manage_event_registration_form'));
router
   .route('/internal/events/:eventId/registration-form')
   .get(getRegistrationForm)
   .put(putRegistrationForm);
router.post(
   '/internal/events/:eventId/registration-form/validate',
   validateRegistrationForm,
);
router.post(
   '/internal/events/:eventId/registration-form/preview',
   previewRegistrationForm,
);
router.post(
   '/internal/events/:eventId/registration-form/publish',
   publishRegistrationForm,
);
router.post(
   '/internal/events/:eventId/registration-form/close',
   closeRegistrationForm,
);
router.post(
   '/internal/events/:eventId/registration-form/duplicate',
   duplicateRegistrationForm,
);
export default router;
