import { Router } from 'express';
import { prisma } from '@/config/prisma.js';
import { requireAuth } from '@/middleware/authMiddleware.js';
import { requirePermission } from '@/middleware/permissionMiddleware.js';
// BELUM ADA VALIDATE REQUEST
import { validateRequest } from './himtiKitValidateRequest.js';
import {
  ResourceRepository,
  SoftwareRepository,
  EligibleAttendeeRepository,
} from './himtiKitRepository.js';
import {
  ResourceService,
  SoftwareService,
  EligibleAttendeeService,
} from './himtiKitService.js';
import {
  ResourceController,
  SoftwareController,
  EligibleAttendeeController,
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

// ==========================================
// AUTH GUARD (semua route di bawah ini adalah internal tool, wajib login admin)
// ==========================================

router.use(requireAuth);
router.use(requirePermission('manage_himti_kit'));

// ==========================================
// ROUTES UNTUK RESOURCES
// ==========================================

router.get(
  '/resources',
  validateRequest({ query: ResourceQuerySchema }),
  resourceController.getAllResources
);

router.get(
  '/resources/:id',
  validateRequest({ params: ResourceParamsSchema }),
  resourceController.getResourceById
);

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

router.get(
  '/software',
  validateRequest({ query: softwareQuerySchema }),
  softwareController.getAllSoftware
);

router.get(
  '/software/:id',
  validateRequest({ params: softwareParamsSchema }),
  softwareController.getSoftwareById
);

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