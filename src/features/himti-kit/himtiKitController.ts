import { Request, Response, NextFunction } from 'express';
import {
  ResourceService,
  SoftwareService,
  EligibleAttendeeService,
} from './himtiKitService.js';
import {
  CreateKitResourcesInput,
  UpdateKitResourcesInput,
  ResourceParams,
  ResourceQuery,
  CreateKitSoftwareInput,
  UpdateKitSoftwareInput,
  SoftwareParams,
  SoftwareQuery,
  CreateAttendeeInput,
  BulkImportAttendeesInput,
  AttendeeParams,
  AttendeeQuery,
} from './himtiKitTypes.js';

// ==========================================
// CONTROLLER UNTUK RESOURCES
// ==========================================

export class ResourceController {
  constructor(private readonly resourceService: ResourceService) {}

  getAllResources = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = req.query as ResourceQuery;
      const resources = await this.resourceService.getAllResources(query);
      res.status(200).json({ success: true, data: resources });
    } catch (error) {
      next(error);
    }
  };

  getResourceById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params as ResourceParams;
      const resource = await this.resourceService.getResourceById(id);
      res.status(200).json({ success: true, data: resource });
    } catch (error) {
      next(error);
    }
  };

  createResource = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = req.body as CreateKitResourcesInput;
      const resource = await this.resourceService.createResource(data);
      res.status(201).json({ success: true, data: resource });
    } catch (error) {
      next(error);
    }
  };

  updateResource = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params as ResourceParams;
      const data = req.body as UpdateKitResourcesInput;
      const resource = await this.resourceService.updateResource(id, data);
      res.status(200).json({ success: true, data: resource });
    } catch (error) {
      next(error);
    }
  };

  deleteResource = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params as ResourceParams;
      await this.resourceService.deleteResource(id);
      res.status(200).json({ success: true, message: 'Resource deleted successfully' });
    } catch (error) {
      next(error);
    }
  };
}

// ==========================================
// CONTROLLER UNTUK SOFTWARE
// ==========================================

export class SoftwareController {
  constructor(private readonly softwareService: SoftwareService) {}

  getAllSoftware = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = req.query as SoftwareQuery;
      const software = await this.softwareService.getAllSoftware(query);
      res.status(200).json({ success: true, data: software });
    } catch (error) {
      next(error);
    }
  };

  getSoftwareById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params as SoftwareParams;
      const software = await this.softwareService.getSoftwareById(id);
      res.status(200).json({ success: true, data: software });
    } catch (error) {
      next(error);
    }
  };

  createSoftware = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = req.body as CreateKitSoftwareInput;
      const software = await this.softwareService.createSoftware(data);
      res.status(201).json({ success: true, data: software });
    } catch (error) {
      next(error);
    }
  };

  updateSoftware = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params as SoftwareParams;
      const data = req.body as UpdateKitSoftwareInput;
      const software = await this.softwareService.updateSoftware(id, data);
      res.status(200).json({ success: true, data: software });
    } catch (error) {
      next(error);
    }
  };

  deleteSoftware = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params as SoftwareParams;
      await this.softwareService.deleteSoftware(id);
      res.status(200).json({ success: true, message: 'Software deleted successfully' });
    } catch (error) {
      next(error);
    }
  };
}

// ==========================================
// CONTROLLER UNTUK ATTENDEE
// ==========================================

export class EligibleAttendeeController {
  constructor(private readonly attendeeService: EligibleAttendeeService) {}

  getAllAttendees = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = req.query as AttendeeQuery;
      const attendees = await this.attendeeService.getAllAttendees(query);
      res.status(200).json({ success: true, data: attendees });
    } catch (error) {
      next(error);
    }
  };

  createAttendee = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = req.body as CreateAttendeeInput;
      const attendee = await this.attendeeService.createAttendee(data);
      res.status(201).json({ success: true, data: attendee });
    } catch (error) {
      next(error);
    }
  };

  bulkImportAttendees = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = req.body as BulkImportAttendeesInput;
      const result = await this.attendeeService.bulkImportAttendees(data);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  };

  deleteAttendee = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params as AttendeeParams;
      await this.attendeeService.deleteAttendee(id);
      res.status(200).json({ success: true, message: 'Attendee deleted successfully' });
    } catch (error) {
      next(error);
    }
  };

  validateAttendee = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { nim } = req.params as { nim: string };
      const result = await this.attendeeService.validateAttendee(nim);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  };
}