import { z } from 'zod';

const videoIdPattern = /^[A-Za-z0-9_-]{11}$/;

/** Parse a YouTube URL locally. No requests are made to user-supplied hosts. */
export function getYoutubeVideoId(value: string): string | null {
   try {
      const url = new URL(value);
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.port) return null;
      const host = url.hostname.toLowerCase();
      let id: string | null = null;
      if (host === 'youtu.be' || host === 'www.youtu.be') {
         const match = url.pathname.match(/^\/([A-Za-z0-9_-]{11})\/?$/);
         id = match?.[1] ?? null;
      } else if (['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com'].includes(host)) {
         if (url.pathname === '/watch' && url.searchParams.getAll('v').length === 1) {
            id = url.searchParams.get('v');
         } else {
            const match = url.pathname.match(/^\/(?:embed|shorts)\/([A-Za-z0-9_-]{11})\/?$/);
            id = match?.[1] ?? null;
         }
      }
      return id && videoIdPattern.test(id) ? id : null;
   } catch {
      return null;
   }
}

export const EducationVideoStatusSchema = z.enum(['DRAFT', 'PUBLISHED']);
const youtubeUrl = z.string().trim().max(2048).refine((value) => getYoutubeVideoId(value) !== null, {
   message: 'Enter a valid YouTube video URL',
});
export const VideoIdParamsSchema = z.object({ videoId: z.string().trim().min(1) });
export const VideoListQuerySchema = z.object({
   search: z.string().trim().max(255).optional(),
   courseId: z.string().trim().min(1).optional(),
   status: EducationVideoStatusSchema.optional(),
   page: z.coerce.number().int().min(1).default(1),
   limit: z.coerce.number().int().min(1).max(100).default(50),
});
const videoFields = {
   title: z.string().trim().min(1).max(255),
   sessionId: z.string().trim().min(1),
   youtubeUrl,
};
export const CreateVideoSchema = z.object({
   ...videoFields,
   status: z.literal('DRAFT').optional().default('DRAFT'),
}).strict();
export const UpdateVideoSchema = z.object({
   title: videoFields.title.optional(),
   sessionId: videoFields.sessionId.optional(),
   youtubeUrl: videoFields.youtubeUrl.optional(),
   status: EducationVideoStatusSchema.optional(),
}).strict().refine((value) => Object.keys(value).length > 0, { message: 'Provide at least one field' });

export const EducationSessionSchema = z.object({
   id: z.string(),
   title: z.string(),
   type: z.enum(['STUDY_CLUB', 'RESPONSI']),
   courseId: z.string(),
   course: z.object({ id: z.string(), name: z.string() }),
   startsAt: z.string().nullable(),
});
export const VideoResponseSchema = z.object({
   id: z.string(),
   title: z.string(),
   sessionId: z.string(),
   session: EducationSessionSchema,
   youtubeUrl: z.string(),
   youtubeVideoId: z.string(),
   status: EducationVideoStatusSchema,
   createdAt: z.string(),
   updatedAt: z.string(),
});
export const SingleVideoResponseSchema = z.object({ data: VideoResponseSchema });
export const VideoListResponseSchema = z.object({
   data: z.array(VideoResponseSchema),
   pagination: z.object({ page: z.number(), limit: z.number(), total: z.number(), totalPages: z.number() }),
});
export type CreateVideo = z.infer<typeof CreateVideoSchema>;
export type UpdateVideo = z.infer<typeof UpdateVideoSchema>;
export type VideoListQuery = z.infer<typeof VideoListQuerySchema>;
