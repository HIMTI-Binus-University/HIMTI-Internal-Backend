import { prisma } from '@/config/prisma.js';
import {HimtiKitResource, HimtiKitSoftware} from '@prisma/client';
import {
  CreateKitResourcesInput,
  UpdateKitResourcesInput,
  GetKitResourcesQuery,
  CreateKitSoftwareInput,
  UpdateKitSoftwareInput,
} from './himtiKitTypes.js';

export class HimtiKitRepository {
  // ==========================================
  // REPOSITORY UNTUK RESOURCES
  // ==========================================

  public async findResources(query: GetKitResourcesQuery): Promise<HimtiKitResource[]> {
    const { major } = query;

    return await prisma.himtiKitResource.findMany({
      where: {
        ...(major && { major }),
      },
      orderBy: [
        { title: 'asc' },
        { createdAt: 'desc' },
      ],
    });
  }

  public async findResourceById(id: string): Promise<HimtiKitResource | null> {
    return await prisma.himtiKitResource.findUnique({
      where: { id },
    });
  }

  public async createResource(data: CreateKitResourcesInput): Promise<HimtiKitResource> {
    return await prisma.himtiKitResource.create({
      data,
    });
  }

  public async updateResource(id: string, data: UpdateKitResourcesInput): Promise<HimtiKitResource> {
    return await prisma.himtiKitResource.update({
      where: { id },
      data,
    });
  }

  public async deleteResource(id: string): Promise<HimtiKitResource> {
    return await prisma.himtiKitResource.delete({
      where: { id },
    });
  }

  // ==========================================
  // REPOSITORY UNTUK SOFTWARE
  // ==========================================

  public async findSoftwares(): Promise<HimtiKitSoftware[]> {
    return await prisma.himtiKitSoftware.findMany({
      orderBy: [
        { name: 'asc' },
        { createdAt: 'desc' },
      ],
    });
  }

  public async findSoftwareById(id: string): Promise<HimtiKitSoftware | null> {
    return await prisma.himtiKitSoftware.findUnique({
      where: { id },
    });
  }

  public async createSoftware(data: CreateKitSoftwareInput): Promise<HimtiKitSoftware> {
    return await prisma.himtiKitSoftware.create({
      data,
    });
  }

  public async updateSoftware(id: string, data: UpdateKitSoftwareInput): Promise<HimtiKitSoftware> {
    return await prisma.himtiKitSoftware.update({
      where: { id },
      data,
    });
  }

  public async deleteSoftware(id: string): Promise<HimtiKitSoftware> {
    return await prisma.himtiKitSoftware.delete({
      where: { id },
    });
  }
}

export const himtiKitRepository = new HimtiKitRepository();