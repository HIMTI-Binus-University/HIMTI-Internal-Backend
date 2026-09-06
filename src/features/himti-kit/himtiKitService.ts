import { himtiKitRepository } from './himtiKitRepository.js';
import { HimtiKitResource, HimtiKitSoftware } from '@prisma/client';
import {
  CreateKitResourcesInput,
  UpdateKitResourcesInput,
  GetKitResourcesQuery,
  CreateKitSoftwareInput,
  UpdateKitSoftwareInput,
} from './himtiKitTypes.js';

export class HimtiKitService {
  // ==========================================
  // 1. SERVICE UNTUK RESOURCES
  // ==========================================

  async getAllResources(query: GetKitResourcesQuery): Promise<HimtiKitResource[]> {
    return await himtiKitRepository.findResources(query);
  }

  async getResourceById(id: string): Promise<HimtiKitResource> {
    const resource = await himtiKitRepository.findResourceById(id);
    if (!resource) {
      throw new Error('HimtiKit Resource not found');
    }
    return resource;
  }

  async createResource(data: CreateKitResourcesInput): Promise<HimtiKitResource> {
    return await himtiKitRepository.createResource(data);
  }

  async updateResource(id: string, data: UpdateKitResourcesInput): Promise<HimtiKitResource> {
    await this.getResourceById(id);
    return await himtiKitRepository.updateResource(id, data);
  }

  async deleteResource(id: string): Promise<HimtiKitResource> {
    await this.getResourceById(id);
    return await himtiKitRepository.deleteResource(id);
  }

  // ==========================================
  // 2. SERVICE UNTUK SOFTWARE
  // ==========================================

  async getAllSoftwares(): Promise<HimtiKitSoftware[]> {
    return await himtiKitRepository.findSoftwares();
  }

  async getSoftwareById(id: string): Promise<HimtiKitSoftware> {
    const software = await himtiKitRepository.findSoftwareById(id);
    if (!software) {
      throw new Error('HimtiKit Software not found');
    }
    return software;
  }

  async createSoftware(data: CreateKitSoftwareInput): Promise<HimtiKitSoftware> {
    return await himtiKitRepository.createSoftware(data);
  }

  async updateSoftware(id: string, data: UpdateKitSoftwareInput): Promise<HimtiKitSoftware> {
    await this.getSoftwareById(id);
    return await himtiKitRepository.updateSoftware(id, data);
  }

  async deleteSoftware(id: string): Promise<HimtiKitSoftware> {
    await this.getSoftwareById(id);
    return await himtiKitRepository.deleteSoftware(id);
  }
}

export const himtiKitService = new HimtiKitService();