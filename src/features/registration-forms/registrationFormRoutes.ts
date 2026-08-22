import express from 'express';
import type { Router } from 'express';
import { requireAuth } from '@/middleware/authMiddleware.js';
import { requirePermission } from '@/middleware/permissionMiddleware.js';
import {
   createFormQuestionOption,
   createFormQuestion,
   deleteFormQuestionOption,
   deleteFormQuestion,
   reorderFormQuestions,
   updateFormQuestionOption,
   updateFormQuestion,
   cloneRegistrationFormV1,
   closeRegistrationFormV1,
   createRegistrationFormV1,
   getPublishedRegistrationFormV1,
   getRegistrationFormV1,
   listRegistrationFormsV1,
   previewRegistrationFormV1,
   publishRegistrationFormV1,
   saveRegistrationFormDraftV1,
   validateRegistrationFormV1,
   deleteRegistrationFormV1,
} from './registrationFormController.js';

const router: Router = express.Router();
export const registrationFormV1Routes: Router = express.Router();

const adminRead = [requireAuth, requirePermission('manage_events')] as const;
const adminWrite = [requireAuth, requirePermission('manage_events')] as const;

registrationFormV1Routes.get(
   '/published/:subEventId/:logicalKey',
   getPublishedRegistrationFormV1,
);
registrationFormV1Routes.get('/', ...adminRead, listRegistrationFormsV1);
registrationFormV1Routes.post('/', ...adminWrite, createRegistrationFormV1);
registrationFormV1Routes.get('/:id', ...adminRead, getRegistrationFormV1);
registrationFormV1Routes.delete(
   '/:id',
   ...adminWrite,
   deleteRegistrationFormV1,
);
registrationFormV1Routes.put(
   '/:id/draft',
   ...adminWrite,
   saveRegistrationFormDraftV1,
);
registrationFormV1Routes.post(
   '/:id/validate',
   ...adminRead,
   validateRegistrationFormV1,
);
registrationFormV1Routes.post(
   '/:id/preview',
   ...adminRead,
   previewRegistrationFormV1,
);
registrationFormV1Routes.post(
   '/:id/clone',
   ...adminWrite,
   cloneRegistrationFormV1,
);
registrationFormV1Routes.post(
   '/:id/publish',
   ...adminWrite,
   publishRegistrationFormV1,
);
registrationFormV1Routes.post(
   '/:id/close',
   ...adminWrite,
   closeRegistrationFormV1,
);

router.post(
   '/:id/question',
   requireAuth,
   requirePermission('manage_events'),
   createFormQuestion,
);
router.patch(
   '/:id/reorder-questions',
   requireAuth,
   requirePermission('manage_events'),
   reorderFormQuestions,
);
router.post(
   '/question/:id/option',
   requireAuth,
   requirePermission('manage_events'),
   createFormQuestionOption,
);
router.patch(
   '/question/:id',
   requireAuth,
   requirePermission('manage_events'),
   updateFormQuestion,
);
router.patch(
   '/question/delete/:id',
   requireAuth,
   requirePermission('manage_events'),
   deleteFormQuestion,
);
router.patch(
   '/option/:id',
   requireAuth,
   requirePermission('manage_events'),
   updateFormQuestionOption,
);
router.patch(
   '/option/delete/:id',
   requireAuth,
   requirePermission('manage_events'),
   deleteFormQuestionOption,
);

export default router;
