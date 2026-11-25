import type { Prisma, ResponsiStatus } from '@prisma/client';
import { AppError } from '@/utils/appError.js';
import { prisma } from '@/config/prisma.js';
import type {
   CourseGroupList,
   CreateCourseGroup,
   UpdateCourseGroup,
} from './educationTypes.js';

class EducationRepository {
   // Course Groups
   async listCourseGroups(query: CourseGroupList) {
      const where: Prisma.CourseWhereInput = {
         status: 'ACTIVE',
         ...(query.search && {
            OR: [
               { name: { contains: query.search, mode: 'insensitive' } },
               { code: { contains: query.search, mode: 'insensitive' } },
            ],
         }),
      };

      return await prisma.course.findMany({
         where,
         orderBy: { name: 'asc' },
         select: {
            id: true,
            name: true,
            code: true,
            description: true,
            status: true,
         },
      });
   }

   async findCourseGroupById(id: string) {
      return await prisma.course.findUnique({
         where: { id },
         select: {
            id: true,
            name: true,
            code: true,
            description: true,
            status: true,
         },
      });
   }

   async findCourseGroupByName(name: string) {
      return await prisma.course.findUnique({
         where: { name },
         select: {
            id: true,
            name: true,
            code: true,
            description: true,
            status: true,
         },
      });
   }

   async createCourseGroup(data: CreateCourseGroup) {
      return await prisma.course.create({
         data: {
            name: data.name,
            code: data.code ? data.code : null,
            description: data.description ? data.description : null,
         },
         select: {
            id: true,
            name: true,
            code: true,
            description: true,
            status: true,
         },
      });
   }

   async updateCourseGroup(id: string, data: UpdateCourseGroup) {
      return await prisma.course.update({
         where: { id },
         data: {
            ...(data.name !== undefined && { name: data.name }),
            ...(data.code !== undefined && {
               code: data.code ? data.code : null,
            }),
            ...(data.description !== undefined && {
               description: data.description ? data.description : null,
            }),
            ...(data.status !== undefined && { status: data.status }),
         },
         select: {
            id: true,
            name: true,
            code: true,
            description: true,
            status: true,
         },
      });
   }

   // Responsi
   async listResponsies(where: Prisma.ResponsiWhereInput, skip = 0, take = 50) {
      return await prisma.responsi.findMany({
         where,
         skip,
         take,
         orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
         include: {
            course: {
               select: {
                  id: true,
                  name: true,
                  code: true,
               },
            },
         },
      });
   }

   async countResponsies(where: Prisma.ResponsiWhereInput) {
      return await prisma.responsi.count({ where });
   }

   async findResponsiById(id: string) {
      return await prisma.responsi.findUnique({
         where: { id },
         include: {
            course: {
               select: {
                  id: true,
                  name: true,
                  code: true,
               },
            },
         },
      });
   }

   async createResponsi(data: {
      title: string;
      summaryType: string;
      courseId: string;
      academicPeriod: string;
      examType: string;
      pic: string;
      content: string;
      status: ResponsiStatus;
   }) {
      return await prisma.responsi.create({
         data,
         include: {
            course: {
               select: {
                  id: true,
                  name: true,
                  code: true,
               },
            },
         },
      });
   }

   async updateResponsi(
      where: Prisma.ResponsiWhereInput & { id: string },
      data: Prisma.ResponsiUncheckedUpdateInput,
      publisherId?: string,
   ) {
      return prisma.$transaction(async (tx) => {
         const { count } = await tx.responsi.updateMany({ where, data });
         if (count !== 1) {
            throw new AppError(
               'Summary changed. Reload it and try again.',
               409,
            );
         }
         const updated = await tx.responsi.findUniqueOrThrow({
            where: { id: where.id },
            include: {
               course: { select: { id: true, name: true, code: true } },
            },
         });

         if (publisherId) {
            const versions = await tx.responsiVersion.count({
               where: { responsiId: updated.id },
            });
            await tx.responsiVersion.create({
               data: {
                  responsiId: updated.id,
                  version: `v${versions + 1}`,
                  content: updated.content,
                  status: 'PUBLISHED',
                  createdBy: publisherId,
               },
            });
         }

         return updated;
      });
   }

   async deleteResponsi(id: string) {
      return prisma.responsi.delete({ where: { id } });
   }

   findResponsiVersion(responsiId: string, versionId: string) {
      return prisma.responsiVersion.findFirst({
         where: { id: versionId, responsiId, status: 'PUBLISHED' },
      });
   }

   async listResponsiVersions(responsiId: string) {
      return await prisma.responsiVersion.findMany({
         where: { responsiId },
         orderBy: { createdAt: 'desc' },
      });
   }
}

export const educationRepository = new EducationRepository();
