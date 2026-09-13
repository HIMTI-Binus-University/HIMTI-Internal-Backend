import { PrismaClient, HimtiKitResource, HimtiKitSoftware, HimtiKitAttendee} from '@prisma/client';
import {
  CreateKitResourcesInput,
  UpdateKitResourcesInput,
  ResourceQuery,
  CreateKitSoftwareInput,
  UpdateKitSoftwareInput,
  SoftwareQuery,
  CreateAttendeeInput,
  AttendeeQuery
} from './himtiKitTypes.js';

// ==========================================
// REPOSITORY UNTUK RESOURCES
// ==========================================

export class ResourceRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findMany(query: ResourceQuery): Promise<HimtiKitResource[]> {
    return this.prisma.himtiKitResource.findMany({
      where: {
        major: query.major,
        ...(query.search && {
          title: { contains: query.search, mode: 'insensitive' },
        }),
      },
      orderBy: { createdAt: 'desc' },
    });
  }
 
  async findById(id: string): Promise<HimtiKitResource | null> {
    return this.prisma.himtiKitResource.findUnique({ where: { id } });
  }
 
  async create(data: CreateKitResourcesInput): Promise<HimtiKitResource> {
    return this.prisma.himtiKitResource.create({ data: {...data } });
  }
 
  async update(id: string, data: UpdateKitResourcesInput): Promise<HimtiKitResource> {
    return this.prisma.himtiKitResource.update({ where: { id }, data });
  }
 
  async delete(id: string): Promise<HimtiKitResource> {
    return this.prisma.himtiKitResource.delete({ where: { id } });
  }
}

// ==========================================
// REPOSITORY UNTUK SOFTWARE
// ==========================================

export class SoftwareRepository {
  constructor(private readonly prisma: PrismaClient) {}
 
  async findMany(query: SoftwareQuery): Promise<HimtiKitSoftware[]> {
    return this.prisma.himtiKitSoftware.findMany({
      where: {
        ...(query.search && {
          name: { contains: query.search, mode: 'insensitive' },
        }),
      },
      orderBy: { createdAt: 'desc' },
    });
  }
 
  async findById(id: string): Promise<HimtiKitSoftware | null> {
    return this.prisma.himtiKitSoftware.findUnique({ where: { id } });
  }
 
  async create(data: CreateKitSoftwareInput): Promise<HimtiKitSoftware> {
    return this.prisma.himtiKitSoftware.create({ data: { ...data } });
  }
 
  async update(id: string, data: UpdateKitSoftwareInput): Promise<HimtiKitSoftware> {
    return this.prisma.himtiKitSoftware.update({ where: { id }, data });
  }
 
  async delete(id: string): Promise<HimtiKitSoftware> {
    return this.prisma.himtiKitSoftware.delete({ where: { id } });
  }
}

// ==========================================
// REPOSITORY UNTUK ATTENDEE
// ==========================================
export class EligibleAttendeeRepository {
  constructor(private readonly prisma: PrismaClient) {}
 
  async findMany(query: AttendeeQuery): Promise<HimtiKitAttendee[]> {
    return this.prisma.himtiKitAttendee.findMany({
      where: {
        ...(query.search && {
          OR: [
            { name: { contains: query.search, mode: 'insensitive' } },
            { nim: { contains: query.search, mode: 'insensitive' } },
          ],
        }),
      },
      orderBy: { createdAt: 'desc' },
    });
  }
 
  async findByNim(nim: string): Promise<HimtiKitAttendee | null> {
    return this.prisma.himtiKitAttendee.findUnique({ where: { nim } });
  }
 
  async create(data: CreateAttendeeInput): Promise<HimtiKitAttendee> {
    return this.prisma.himtiKitAttendee.create({ data: { ...data } });
  }
 
  async createMany(rows: CreateAttendeeInput[]): Promise<number> {
    const result = await this.prisma.himtiKitAttendee.createMany({
      data: rows,
      skipDuplicates: true,
    });
    return result.count;
  }
 
  async delete(id: string): Promise<HimtiKitAttendee> {
    return this.prisma.himtiKitAttendee.delete({ where: { id } });
  }
}