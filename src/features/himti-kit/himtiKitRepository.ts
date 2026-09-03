import { prisma } from "@/config/prisma.js";
import {
  CreateKitResourcesInput,
  UpdateKitResourcesInput,
  GetKitResourcesQuery,
  CreateKitSoftwareInput,
  UpdateKitSoftwareInput,
} from './himtiKitTypes.js'; 

// ==========================================
// REPOSITORY UNTUK RESOURCES
// ==========================================

export const findResources = async (query: GetKitResourcesQuery) => {
  const { major } = query;

  return await prisma.himtiKitResource.findMany({
    where: {
      ...(major && { major }),
    },
    orderBy: [
      {title: 'asc'},
      {createdAt: 'desc'}
    ],
  });
};

export const findResourceById = async (id: string) => {
  return await prisma.himtiKitResource.findUnique({
    where: { id },
  });
};

export const createResource = async (data: CreateKitResourcesInput) => {
  return await prisma.himtiKitResource.create({
    data,
  });
};

export const updateResource = async (id: string, data: UpdateKitResourcesInput) => {
  return await prisma.himtiKitResource.update({
    where: { id },
    data,
  });
};

export const deleteResource = async (id: string) => {
  return await prisma.himtiKitResource.delete({
    where: { id },
  });
};

// ==========================================
// REPOSITORY UNTUK SOFTWARE
// ==========================================

export const findSoftwares = async () => {
  return await prisma.himtiKitSoftware.findMany({
    orderBy: [
      {name: 'asc'},
      {createdAt: 'desc'}
    ],
  });
};

export const findSoftwareById = async (id: string) => {
  return await prisma.himtiKitSoftware.findUnique({
    where: { id },
  });
};

export const createSoftware = async (data: CreateKitSoftwareInput) => {
  return await prisma.himtiKitSoftware.create({
    data,
  });
};

export const updateSoftware = async (id: string, data: UpdateKitSoftwareInput) => {
  return await prisma.himtiKitSoftware.update({
    where: { id },
    data,
  });
};

export const deleteSoftware = async (id: string) => {
  return await prisma.himtiKitSoftware.delete({
    where: { id },
  });
};