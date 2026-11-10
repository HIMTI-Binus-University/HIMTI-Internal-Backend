import type { Prisma } from '@prisma/client';
import { prisma } from '@/config/prisma.js';
import { AppError } from '@/utils/appError.js';

// The Videos feature cannot validate or display sessions until a session provider is integrated.
const sessionIntegrationUnavailable = (): never => {
   throw new AppError('Education session integration is not available yet', 503, 'SESSION_INTEGRATION_UNAVAILABLE');
};

const videoSelect = {
   id: true, title: true, sessionId: true, youtubeUrl: true,
   youtubeVideoId: true, status: true, createdAt: true, updatedAt: true,
} satisfies Prisma.EducationVideoSelect;

type VideoSession = {
   id: string;
   title: string;
   type: 'STUDY_CLUB' | 'RESPONSI';
   courseId: string;
   course: { id: string; name: string };
   startsAt: Date | null;
};

const getSession = async (_id: string): Promise<VideoSession | null> => sessionIntegrationUnavailable();
const getSessionIdsForCourse = async (_courseId: string): Promise<string[]> => sessionIntegrationUnavailable();

const withSession = async <T extends { sessionId: string }>(video: T) => {
   const session = await getSession(video.sessionId);
   if (!session) throw new AppError('Education session not found', 404, 'SESSION_NOT_FOUND');
   return { ...video, session };
};

export const videoRepository = {
   findSession: getSession,
   findSessionIdsByCourse: getSessionIdsForCourse,
   list: async (where: Prisma.EducationVideoWhereInput, skip: number, take: number) => {
      const videos = await prisma.educationVideo.findMany({
         where, skip, take, select: videoSelect,
         orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
      });
      return Promise.all(videos.map(withSession));
   },
   count: (where: Prisma.EducationVideoWhereInput) => prisma.educationVideo.count({ where }),
   find: async (id: string) => {
      const video = await prisma.educationVideo.findUnique({ where: { id }, select: videoSelect });
      return video ? withSession(video) : null;
   },
   create: async (data: Prisma.EducationVideoUncheckedCreateInput) =>
      withSession(await prisma.educationVideo.create({ data, select: videoSelect })),
   update: async (id: string, data: Prisma.EducationVideoUncheckedUpdateInput) =>
      withSession(await prisma.educationVideo.update({ where: { id }, data, select: videoSelect })),
   delete: (id: string) => prisma.educationVideo.deleteMany({ where: { id } }),
};
