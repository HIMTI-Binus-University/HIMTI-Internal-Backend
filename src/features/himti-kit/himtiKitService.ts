import {
  ResourceRepository,
  SoftwareRepository,
  EligibleAttendeeRepository,
} from './himtiKitRepository.js';
import {
  CreateKitResourcesInput,
  UpdateKitResourcesInput,
  ResourceQuery,
  CreateKitSoftwareInput,
  UpdateKitSoftwareInput,
  SoftwareQuery,
  CreateAttendeeInput,
  BulkImportAttendeesInput,
  AttendeeQuery,
} from './himtiKitTypes.js';
import { AppError } from '@/utils/appError.js';

// ==========================================
// SERVICE UNTUK RESOURCES
// ==========================================

export class ResourceService {
  constructor(private readonly resourceRepository: ResourceRepository) {}

  async getAllResources(query: ResourceQuery) {
    return this.resourceRepository.findMany(query);
  }

  async getResourceById(id: string) {
    const resource = await this.resourceRepository.findById(id);
    if (!resource) {
      throw new AppError('Resource not found', 404);
    }
    return resource;
  }

  async createResource(data: CreateKitResourcesInput) {
    return this.resourceRepository.create(data);
  }

  async updateResource(id: string, data: UpdateKitResourcesInput) {
    await this.getResourceById(id);
    return this.resourceRepository.update(id, data);
  }

  async deleteResource(id: string) {
    await this.getResourceById(id);
    return this.resourceRepository.delete(id);
  }
}

// ==========================================
// SERVICE UNTUK SOFTWARE
// ==========================================

export class SoftwareService {
  constructor(private readonly softwareRepository: SoftwareRepository) {}

  async getAllSoftware(query: SoftwareQuery) {
    return this.softwareRepository.findMany(query);
  }

  async getSoftwareById(id: string) {
    const software = await this.softwareRepository.findById(id);
    if (!software) {
      throw new AppError('Software not found', 404);
    }
    return software;
  }

  async createSoftware(data: CreateKitSoftwareInput) {
    return this.softwareRepository.create(data);
  }

  async updateSoftware(id: string, data: UpdateKitSoftwareInput) {
    await this.getSoftwareById(id);
    return this.softwareRepository.update(id, data);
  }

  async deleteSoftware(id: string) {
    await this.getSoftwareById(id);
    return this.softwareRepository.delete(id);
  }
}

// ==========================================
// SERVICE UNTUK ATTENDEE
// ==========================================

export class EligibleAttendeeService {
  constructor(private readonly attendeeRepository: EligibleAttendeeRepository) {}

  async getAllAttendees(query: AttendeeQuery) {
    return this.attendeeRepository.findMany(query);
  }

  async createAttendee(data: CreateAttendeeInput) {
    const existing = await this.attendeeRepository.findByNim(data.nim);
    if (existing) {
      throw new AppError('NIM is already registered', 409);
    }
    return this.attendeeRepository.create(data);
  }

  async bulkImportAttendees(data: BulkImportAttendeesInput) {
    const totalImported = await this.attendeeRepository.createMany(data.attendees);

    return {
      totalSubmitted: data.attendees.length,
      totalImported,
      totalSkipped: data.attendees.length - totalImported,
    };
  }

  async deleteAttendee(id: string) {
    return this.attendeeRepository.delete(id);
  }

  async validateAttendee(nim: string) {
    const attendee = await this.attendeeRepository.findByNim(nim);
 
    if (!attendee) {
      return { eligible: false };
    }
 
    return { eligible: true, name: attendee.name };
  }
}