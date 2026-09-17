import { Router } from 'express';
import { prisma } from '@/config/prisma.js';
import { requireAuth } from '@/middleware/authMiddleware.js';
import { requirePermission } from '@/middleware/permissionMiddleware.js';
import { validateRequest } from './himtiKitValidateRequest.js';
import {
  ResourceRepository,
  SoftwareRepository,
  EligibleAttendeeRepository,
  AppearanceRepository,
} from './himtiKitRepository.js';
import {
  ResourceService,
  SoftwareService,
  EligibleAttendeeService,
  AppearanceService,
} from './himtiKitService.js';
import {
  ResourceController,
  SoftwareController,
  EligibleAttendeeController,
  AppearanceController,
} from './himtiKitController.js';
import {
  CreateKitResourcesSchema,
  UpdateKitResourcesSchema,
  ResourceParamsSchema,
  ResourceQuerySchema,
  CreateKitSoftwareSchema,
  UpdateKitSoftwareSchema,
  softwareParamsSchema,
  softwareQuerySchema,
  CreateAttendeeSchema,
  BulkImportAttendeesSchema,
  AttendeeParamsSchema,
  AttendeeQuerySchema,
  UpdateKitAppearanceSchema,
} from './himtiKitSchema.js';

const router = Router();
const publicRouter = Router();

const resourceRepository = new ResourceRepository(prisma);
const resourceService = new ResourceService(resourceRepository);
const resourceController = new ResourceController(resourceService);

const softwareRepository = new SoftwareRepository(prisma);
const softwareService = new SoftwareService(softwareRepository);
const softwareController = new SoftwareController(softwareService);

const attendeeRepository = new EligibleAttendeeRepository(prisma);
const attendeeService = new EligibleAttendeeService(attendeeRepository);
const attendeeController = new EligibleAttendeeController(attendeeService);

const appearanceRepository = new AppearanceRepository(prisma);
const appearanceService = new AppearanceService(appearanceRepository);
const appearanceController = new AppearanceController(appearanceService);

// ==========================================
// ROUTES PUBLIK
// ==========================================

publicRouter.get('/attendees/validate/:nim', attendeeController.validateAttendee);

publicRouter.get(
  '/resources',
  validateRequest({ query: ResourceQuerySchema }),
  resourceController.getAllResources
);
 
publicRouter.get(
  '/resources/:id',
  validateRequest({ params: ResourceParamsSchema }),
  resourceController.getResourceById
);
 
publicRouter.get(
  '/software',
  validateRequest({ query: softwareQuerySchema }),
  softwareController.getAllSoftware
);
 
publicRouter.get(
  '/software/:id',
  validateRequest({ params: softwareParamsSchema }),
  softwareController.getSoftwareById
);

publicRouter.get('/appearance', appearanceController.getAppearance);


// ==========================================
// AUTH GUARD (semua route di bawah ini adalah internal tool, wajib login admin)
// ==========================================

router.use(requireAuth);
router.use(requirePermission('manage_himti_kit'));

// ==========================================
// ROUTES UNTUK RESOURCES
// ==========================================

router.post(
  '/resources',
  validateRequest({ body: CreateKitResourcesSchema }),
  resourceController.createResource
);

router.patch(
  '/resources/:id',
  validateRequest({ params: ResourceParamsSchema, body: UpdateKitResourcesSchema }),
  resourceController.updateResource
);

router.delete(
  '/resources/:id',
  validateRequest({ params: ResourceParamsSchema }),
  resourceController.deleteResource
);

// ==========================================
// ROUTES UNTUK SOFTWARE
// ==========================================

router.post(
  '/software',
  validateRequest({ body: CreateKitSoftwareSchema }),
  softwareController.createSoftware
);

router.patch(
  '/software/:id',
  validateRequest({ params: softwareParamsSchema, body: UpdateKitSoftwareSchema }),
  softwareController.updateSoftware
);

router.delete(
  '/software/:id',
  validateRequest({ params: softwareParamsSchema }),
  softwareController.deleteSoftware
);

// ==========================================
// ROUTES UNTUK ATTENDEE
// ==========================================

router.get(
  '/attendees',
  validateRequest({ query: AttendeeQuerySchema }),
  attendeeController.getAllAttendees
);

router.post(
  '/attendees',
  validateRequest({ body: CreateAttendeeSchema }),
  attendeeController.createAttendee
);

router.post(
  '/attendees/bulk-import',
  validateRequest({ body: BulkImportAttendeesSchema }),
  attendeeController.bulkImportAttendees
);

router.delete(
  '/attendees/:id',
  validateRequest({ params: AttendeeParamsSchema }),
  attendeeController.deleteAttendee
);

router.patch(
  '/appearance',
  validateRequest({ body: UpdateKitAppearanceSchema }),
  appearanceController.updateAppearance
);
 
router.post('/appearance/reset', appearanceController.resetAppearance);
 
export default router;
export { publicRouter as himtiKitPublicRoutes };