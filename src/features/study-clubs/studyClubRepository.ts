import type { Prisma } from '@prisma/client';
import { prisma } from '@/config/prisma.js';
import type { CreateStudyClub, StudyClubListQuery } from './studyClubTypes.js';

const courseInclude = {
   course: { select: { id: true, name: true } },
} satisfies Prisma.StudyClubSessionInclude;

class StudyClubRepository {
   list(query: StudyClubListQuery, now: Date) {
      const where: Prisma.StudyClubSessionWhereInput = {
         ...(query.type && { type: query.type }),
         ...(query.course && { course: { name: query.course } }),
         ...(query.schedule === 'past' && { endsAt: { lte: now } }),
         ...(query.schedule === 'upcoming' && { endsAt: { gt: now } }),
         ...(query.search && {
            OR: [
               { title: { contains: query.search, mode: 'insensitive' } },
               { location: { contains: query.search, mode: 'insensitive' } },
               {
                  course: {
                     name: { contains: query.search, mode: 'insensitive' },
                  },
               },
            ],
         }),
      };
      return prisma.$transaction([
         prisma.studyClubSession.findMany({
            where,
            skip: (query.page - 1) * query.limit,
            take: query.limit,
            orderBy: [
               { startsAt: query.schedule === 'past' ? 'desc' : 'asc' },
               { id: 'asc' },
            ],
            include: courseInclude,
         }),
         prisma.studyClubSession.count({ where }),
      ]);
   }

   findById(id: string) {
      return prisma.studyClubSession.findUnique({
         where: { id },
         include: courseInclude,
      });
   }

   create(data: CreateStudyClub, actorId: string) {
      return prisma.studyClubSession.create({
         data: { ...data, createdBy: actorId, updatedBy: actorId },
         include: courseInclude,
      });
   }

   update(id: string, data: CreateStudyClub, actorId: string) {
      return prisma.studyClubSession.update({
         where: { id },
         data: { ...data, updatedBy: actorId },
         include: courseInclude,
      });
   }
}

export const studyClubRepository = new StudyClubRepository();
