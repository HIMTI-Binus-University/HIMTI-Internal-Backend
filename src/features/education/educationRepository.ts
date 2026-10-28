import type { Prisma } from '@prisma/client';
import { prisma } from '@/config/prisma.js';
import type { CourseGroupList } from './educationTypes.js';

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
}

export const educationRepository = new EducationRepository();
