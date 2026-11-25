import type { z } from 'zod';
import type { PublicStudyClubQuerySchema } from './studyClubSchema.js';
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

   listPublic(query: z.infer<typeof PublicStudyClubQuerySchema>, now: Date) {
      const publishedVideo = { status: 'PUBLISHED' } as const;
      const recordingView = query.view === 'recent-recordings';
      const where: Prisma.StudyClubSessionWhereInput = {
         isDemo: false,
         isPublic: true,
         course: { status: 'ACTIVE' },
         courseId: query.courseId,
         startsAt: {
            gte: query.from ? new Date(query.from) : undefined,
            lt: query.to ? new Date(query.to) : undefined,
         },
         ...(query.view === 'upcoming' && { endsAt: { gt: now } }),
         ...(recordingView && {
            endsAt: { lte: now },
            videos: { some: publishedVideo },
         }),
      };

      return prisma.$transaction([
         prisma.studyClubSession.findMany({
            where,
            skip: (query.page - 1) * query.limit,
            take: query.limit,
            orderBy: recordingView
               ? [{ endsAt: 'desc' }, { id: 'asc' }]
               : [{ startsAt: 'asc' }, { id: 'asc' }],
            select: {
               id: true,
               title: true,
               type: true,
               courseId: true,
               description: true,
               startsAt: true,
               endsAt: true,
               location: true,
               registrationUrl: true,
               capacity: true,
               course: courseInclude.course,
               videos: {
                  where: publishedVideo,
                  orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
                  select: { id: true, title: true, youtubeUrl: true },
               },
            },
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
