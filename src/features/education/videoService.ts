import { Prisma } from '@prisma/client';
import { AppError } from '@/utils/appError.js';
import { videoRepository } from './videoRepository.js';
import { getYoutubeVideoId } from './videoSchema.js';
import type { CreateVideo, UpdateVideo, VideoListQuery } from './videoSchema.js';

// A session represents a recording event, never a Responsi summary document.
export function createVideoService(repo: typeof videoRepository = videoRepository) {
   const requireSession = async (id: string) => {
      if (!(await repo.findSession(id))) {
         throw new AppError('Education session not found', 404, 'SESSION_NOT_FOUND');
      }
   };
   const requireVideo = async (id: string) => {
      const video = await repo.find(id);
      if (!video) throw new AppError('Video not found', 404, 'VIDEO_NOT_FOUND');
      return video;
   };
   const write = async <T>(operation: () => Promise<T>): Promise<T> => {
      try {
         return await operation();
      } catch (error) {
         if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
            throw new AppError('The selected session is no longer available', 409, 'SESSION_CONFLICT');
         }
         if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
            throw new AppError('Video not found', 404, 'VIDEO_NOT_FOUND');
         }
         throw error;
      }
   };
   return {
      async list(query: VideoListQuery) {
         const sessionIds = query.courseId ? await repo.findSessionIdsByCourse(query.courseId) : undefined;
         const where: Prisma.EducationVideoWhereInput = {
            ...(query.search ? { title: { contains: query.search, mode: 'insensitive' } } : {}),
            ...(sessionIds ? { sessionId: { in: sessionIds } } : {}),
            ...(query.status ? { status: query.status } : {}),
         };
         const [data, total] = await Promise.all([
            repo.list(where, (query.page - 1) * query.limit, query.limit),
            repo.count(where),
         ]);
         return { data, pagination: { page: query.page, limit: query.limit, total, totalPages: Math.max(1, Math.ceil(total / query.limit)) } };
      },
      get: requireVideo,
      async create(data: CreateVideo) {
         await requireSession(data.sessionId);
         const youtubeVideoId = getYoutubeVideoId(data.youtubeUrl);
         if (!youtubeVideoId) throw new AppError('Invalid YouTube URL', 400, 'VALIDATION_ERROR');
         return write(() => repo.create({ ...data, youtubeVideoId }));
      },
      async update(id: string, data: UpdateVideo) {
         await requireVideo(id);
         if (data.sessionId !== undefined) await requireSession(data.sessionId);
         const youtubeVideoId = data.youtubeUrl === undefined ? undefined : getYoutubeVideoId(data.youtubeUrl);
         if (data.youtubeUrl !== undefined && !youtubeVideoId) throw new AppError('Invalid YouTube URL', 400, 'VALIDATION_ERROR');
         return write(() => repo.update(id, { ...data, ...(youtubeVideoId ? { youtubeVideoId } : {}) }));
      },
      async delete(id: string) {
         const result = await repo.delete(id);
         if (!result.count) throw new AppError('Video not found', 404, 'VIDEO_NOT_FOUND');
      },
   };
}

export const videoService = createVideoService();
