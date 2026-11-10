import type { Prisma } from '@prisma/client';
import { prisma } from '@/config/prisma.js';

const sessionSelect = {
   id: true,
   title: true,
   type: true,
   courseId: true,
   course: { select: { id: true, name: true } },
   startsAt: true,
} satisfies Prisma.StudyClubSessionSelect;

const videoSelect = {
   id: true,
   title: true,
   sessionId: true,
   youtubeUrl: true,
   youtubeVideoId: true,
   status: true,
   createdAt: true,
   updatedAt: true,
   session: { select: sessionSelect },
} satisfies Prisma.EducationVideoSelect;

type VideoRow = Prisma.EducationVideoGetPayload<{ select: typeof videoSelect }>;

const formatVideo = ({ session, ...video }: VideoRow) => ({
   ...video,
   session: {
      ...session,
      type: session.type === 'Study Club' ? ('STUDY_CLUB' as const) : ('RESPONSI' as const),
   },
});

export const videoRepository = {
   findSession: (id: string) =>
      prisma.studyClubSession.findUnique({ where: { id }, select: sessionSelect }),

   list: async (where: Prisma.EducationVideoWhereInput, skip: number, take: number) => {
      const videos = await prisma.educationVideo.findMany({
         where,
         skip,
         take,
         select: videoSelect,
         orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
      });
      return videos.map(formatVideo);
   },

   count: (where: Prisma.EducationVideoWhereInput) =>
      prisma.educationVideo.count({ where }),

   find: async (id: string) => {
      const video = await prisma.educationVideo.findUnique({
         where: { id },
         select: videoSelect,
      });
      return video ? formatVideo(video) : null;
   },

   create: async (data: Prisma.EducationVideoUncheckedCreateInput) =>
      formatVideo(await prisma.educationVideo.create({ data, select: videoSelect })),

   update: async (id: string, data: Prisma.EducationVideoUncheckedUpdateInput) =>
      formatVideo(await prisma.educationVideo.update({ where: { id }, data, select: videoSelect })),

   delete: (id: string) => prisma.educationVideo.deleteMany({ where: { id } }),
};
