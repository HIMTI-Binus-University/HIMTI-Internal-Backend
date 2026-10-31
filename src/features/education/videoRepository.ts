import type { Prisma } from '@prisma/client';
import { prisma } from '@/config/prisma.js';

const sessionSelect = {
   id: true,
   title: true,
   type: true,
   courseId: true,
   course: { select: { id: true, name: true } },
   startsAt: true,
} satisfies Prisma.EducationSessionSelect;

const videoSelect = {
   id: true,
   title: true,
   sessionId: true,
   session: { select: sessionSelect },
   youtubeUrl: true,
   youtubeVideoId: true,
   status: true,
   createdAt: true,
   updatedAt: true,
} satisfies Prisma.EducationVideoSelect;

export const videoRepository = {
   listSessions: () => prisma.educationSession.findMany({
      select: sessionSelect,
      orderBy: [{ title: 'asc' }, { id: 'asc' }],
   }),
   findSession: (id: string) => prisma.educationSession.findUnique({
      where: { id }, select: { id: true },
   }),
   list: (where: Prisma.EducationVideoWhereInput, skip: number, take: number) =>
      prisma.educationVideo.findMany({
         where, skip, take, select: videoSelect,
         orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
      }),
   count: (where: Prisma.EducationVideoWhereInput) => prisma.educationVideo.count({ where }),
   find: (id: string) => prisma.educationVideo.findUnique({ where: { id }, select: videoSelect }),
   create: (data: Prisma.EducationVideoUncheckedCreateInput) =>
      prisma.educationVideo.create({ data, select: videoSelect }),
   update: (id: string, data: Prisma.EducationVideoUncheckedUpdateInput) =>
      prisma.educationVideo.update({ where: { id }, data, select: videoSelect }),
   delete: (id: string) => prisma.educationVideo.deleteMany({ where: { id } }),
};
