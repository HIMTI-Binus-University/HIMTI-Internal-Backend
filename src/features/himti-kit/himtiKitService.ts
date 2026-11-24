import { nanoid } from 'nanoid';
import {
  ResourceRepository,
  SoftwareRepository,
  EligibleAttendeeRepository,
  AppearanceRepository,
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
  UpdateKitAppearanceInput,
  BulkImportResourcesInput,
  BulkImportSoftwareInput,
  BulkImportResult,
  BulkImportSkippedRow,
} from './himtiKitTypes.js';
import { AppError } from '@/utils/appError.js';
import type { HimtiKitResource } from '@prisma/client';

// Older clients read a single `major`; keep it alongside the full `majors` list.
export const toResourceResponse = (resource: HimtiKitResource) => ({
  ...resource,
  major: resource.majors[0] ?? null,
});

// Splits rows into new ones and ones whose key already exists (case-insensitive).
export const splitExistingRows = <T>(
  rows: T[],
  existingKeys: string[],
  key: (row: T) => string,
): { fresh: T[]; skipped: BulkImportSkippedRow[] } => {
  const existing = new Set(existingKeys.map((value) => value.trim().toLowerCase()));
  const fresh: T[] = [];
  const skipped: BulkImportSkippedRow[] = [];
  rows.forEach((row, index) => {
    if (existing.has(key(row).trim().toLowerCase())) {
      skipped.push({ row: index + 1, key: key(row), reason: 'Already exists' });
    } else {
      fresh.push(row);
    }
  });
  return { fresh, skipped };
};

// ==========================================
// SERVICE UNTUK RESOURCES
// ==========================================

export class ResourceService {
  constructor(private readonly resourceRepository: ResourceRepository) {}

  async getAllResources(query: ResourceQuery) {
    const resources = await this.resourceRepository.findMany(query);
    return resources.map(toResourceResponse);
  }

  private async findResourceOrThrow(id: string) {
    const resource = await this.resourceRepository.findById(id);
    if (!resource) {
      throw new AppError('Resource not found', 404);
    }
    return resource;
  }

  async getResourceById(id: string) {
    return toResourceResponse(await this.findResourceOrThrow(id));
  }

  async createResource(data: CreateKitResourcesInput) {
    return toResourceResponse(await this.resourceRepository.create(data));
  }

  async updateResource(id: string, data: UpdateKitResourcesInput) {
    await this.findResourceOrThrow(id);
    return toResourceResponse(await this.resourceRepository.update(id, data));
  }

  async bulkImportResources(data: BulkImportResourcesInput): Promise<BulkImportResult> {
    const { fresh, skipped } = splitExistingRows(
      data.resources,
      await this.resourceRepository.findTitles(),
      (row) => row.title,
    );
    const totalCreated = fresh.length
      ? await this.resourceRepository.createMany(fresh.map((row) => ({ id: nanoid(), ...row })))
      : 0;
    return { totalSubmitted: data.resources.length, totalCreated, totalSkipped: skipped.length, skipped };
  }

  async deleteResource(id: string) {
    await this.findResourceOrThrow(id);
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

  async bulkImportSoftware(data: BulkImportSoftwareInput): Promise<BulkImportResult> {
    const { fresh, skipped } = splitExistingRows(
      data.software,
      await this.softwareRepository.findNames(),
      (row) => row.name,
    );
    const totalCreated = fresh.length
      ? await this.softwareRepository.createMany(fresh.map((row) => ({ id: nanoid(), ...row })))
      : 0;
    return { totalSubmitted: data.software.length, totalCreated, totalSkipped: skipped.length, skipped };
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
    const attendee = await this.attendeeRepository.upsertByNim(nanoid(), data);
    return { attendee, created: !existing };
  }

  async bulkImportAttendees(data: BulkImportAttendeesInput) {
    const latestByNim = new Map<string, CreateAttendeeInput>();
    for (const attendee of data.attendees) {
      latestByNim.set(attendee.nim, attendee);
    }
    const uniqueAttendees = Array.from(latestByNim.values());
 
    const existingNims = new Set(
      await this.attendeeRepository.findExistingNims(
        uniqueAttendees.map((attendee) => attendee.nim),
      ),
    );
 
    await this.attendeeRepository.upsertMany(
      uniqueAttendees.map((attendee) => ({ id: nanoid(), ...attendee })),
    );
 
    const totalUpdated = uniqueAttendees.filter((attendee) =>
      existingNims.has(attendee.nim),
    ).length;
 
    return {
      totalSubmitted: data.attendees.length,
      totalCreated: uniqueAttendees.length - totalUpdated,
      totalUpdated,
      totalDuplicatesInPayload: data.attendees.length - uniqueAttendees.length,
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

// ==========================================
// SERVICE UNTUK APPEARANCE
// ==========================================
 
export class AppearanceService {
  constructor(private readonly appearanceRepository: AppearanceRepository) {}
 
  async getAppearance() {
    return this.appearanceRepository.getOrCreate(nanoid());
  }
 
  async updateAppearance(data: UpdateKitAppearanceInput) {
    const current = await this.appearanceRepository.getOrCreate(nanoid());
    return this.appearanceRepository.update(current.id, data);
  }
 
  async resetAppearance() {
    const current = await this.appearanceRepository.getOrCreate(nanoid());
    return this.appearanceRepository.resetToDefault(current.id);
  }
}