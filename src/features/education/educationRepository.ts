import type { Prisma } from '@prisma/client';
import { prisma } from '@/config/prisma.js';
import type {
   CourseGroupList,
   CreateCourseGroup,
   UpdateCourseGroup,
} from './educationTypes.js';

class EducationRepository {
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
            status: true,
         },
      });
   }

   async createCourseGroup(data: CreateCourseGroup) {
      return await prisma.course.create({
         data: {
            name: data.name,
            code: data.code ? data.code : null,
         },
         select: {
            id: true,
            name: true,
            code: true,
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
            ...(data.status !== undefined && { status: data.status }),
         },
         select: {
            id: true,
            name: true,
            code: true,
            status: true,
         },
      });
   }
}

export const educationRepository = new EducationRepository();
