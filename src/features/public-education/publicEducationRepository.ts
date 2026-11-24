import type { Prisma } from '@prisma/client';
import { prisma } from '@/config/prisma.js';

const publicCourse = {
   status: 'ACTIVE',
   semester: { gt: 0 },
   code: { not: null, notIn: [''] },
} satisfies Prisma.CourseWhereInput;

const publishedSummary = {
   status: 'PUBLISHED',
   examType: { in: ['Mid Exam', 'Final Exam'] },
} satisfies Prisma.ResponsiWhereInput;

const summaryFields = {
   id: true,
   title: true,
   academicPeriod: true,
   examType: true,
} satisfies Prisma.ResponsiSelect;

export const publicEducationRepository = {
   catalog() {
      return prisma.$transaction(
         (tx) =>
            tx.course.findMany({
               where: publicCourse,
               orderBy: [{ semester: 'asc' }, { name: 'asc' }, { id: 'asc' }],
               select: {
                  id: true,
                  code: true,
                  name: true,
                  semester: true,
                  description: true,
                  responsies: {
                     where: publishedSummary,
                     orderBy: [{ title: 'asc' }, { id: 'asc' }],
                     select: summaryFields,
                  },
                  studyClubSessions: {
                     where: { isPublic: true, isDemo: false },
                     orderBy: [{ startsAt: 'asc' }, { id: 'asc' }],
                     select: {
                        id: true,
                        title: true,
                        type: true,
                        description: true,
                        startsAt: true,
                        endsAt: true,
                        location: true,
                        capacity: true,
                        videos: {
                           where: { status: 'PUBLISHED' },
                           orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
                           take: 1,
                           select: { youtubeVideoId: true },
                        },
                     },
                  },
               },
            }),
         { isolationLevel: 'RepeatableRead' },
      );
   },

   summary(id: string) {
      return prisma.responsi.findFirst({
         where: { id, ...publishedSummary, course: publicCourse },
         select: {
            ...summaryFields,
            content: true,
            course: {
               select: {
                  id: true,
                  semester: true,
                  code: true,
                  name: true,
                  description: true,
               },
            },
         },
      });
   },
};
