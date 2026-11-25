import { z } from 'zod';
import { isHttpUrl } from '@/utils/httpUrl.js';

const optionalLink = z
   .string()
   .trim()
   .max(2048)
   .refine(
      (value) =>
         value === '' ||
         (/^https?:\/\/[^/\s\\]/i.test(value) &&
            !/[\s\\]/.test(value) &&
            isHttpUrl(value)),
      'Use a valid http:// or https:// URL',
   );

const sessionFields = z
   .object({
      title: z.string().trim().min(1).max(255),
      type: z.enum(['Study Club', 'Responsi']),
      courseId: z.string().trim().min(1).max(100),
      description: z.string().trim().max(5000),
      startsAt: z.iso.datetime({ offset: true }),
      endsAt: z.iso.datetime({ offset: true }),
      location: z.string().trim().max(255),
      meetingUrl: optionalLink,
      registrationUrl: optionalLink,
      capacity: z.number().int().min(1).max(2_147_483_647).nullable(),
      isPublic: z.boolean().optional(),
   })
   .strict();

export const CreateStudyClubSchema = sessionFields
   .refine((value) => Date.parse(value.endsAt) > Date.parse(value.startsAt), {
      message: 'End date and time must be after the start',
      path: ['endsAt'],
   })
   .refine((value) => Boolean(value.location || value.meetingUrl), {
      message: 'Add a location or an online meeting link',
      path: ['location'],
   });

export const UpdateStudyClubSchema = sessionFields
   .partial()
   .refine(
      (value) => Object.keys(value).length > 0,
      'Provide at least one field to update',
   );

export const StudyClubIdParamSchema = z.object({
   sessionId: z.string().trim().min(1).max(100),
});

export const StudyClubListQuerySchema = z.object({
   search: z.string().trim().max(255).optional(),
   course: z.string().trim().max(255).optional(),
   type: z.enum(['Study Club', 'Responsi']).optional(),
   schedule: z.enum(['upcoming', 'past', 'all']).default('upcoming'),
   page: z.coerce.number().int().min(1).max(1_000_000).default(1),
   limit: z.coerce.number().int().min(1).max(100).default(6),
});

export const StudyClubSessionSchema = sessionFields.extend({
   id: z.string(),
   course: z.string(),
   isDemo: z.boolean(),
   createdAt: z.string(),
   updatedAt: z.string(),
});

export const StudyClubResponseSchema = z.object({
   data: StudyClubSessionSchema,
});

export const StudyClubListResponseSchema = z.object({
   data: z.array(StudyClubSessionSchema),
   pagination: z.object({
      page: z.number(),
      limit: z.number(),
      total: z.number(),
      totalPages: z.number(),
   }),
});

export const PublicStudyClubQuerySchema = StudyClubListQuerySchema.pick({
   page: true,
   limit: true,
})
   .extend({
      courseId: z.string().trim().min(1).max(100).optional(),
      from: z.iso.datetime({ offset: true }).optional(),
      to: z.iso.datetime({ offset: true }).optional(),
      view: z.enum(['all', 'upcoming', 'recent-recordings']).default('all'),
   })
   .refine(
      ({ from, to }) => !from || !to || Date.parse(from) < Date.parse(to),
      { path: ['to'], message: 'End of date range must be after the start' },
   );

export const PublicStudyClubSessionSchema = sessionFields
   .pick({
      title: true,
      type: true,
      courseId: true,
      description: true,
      startsAt: true,
      endsAt: true,
      location: true,
      registrationUrl: true,
      capacity: true,
   })
   .extend({
      id: z.string(),
      course: z.object({ id: z.string(), name: z.string() }),
      videos: z.array(
         z.object({
            id: z.string(),
            title: z.string(),
            youtubeUrl: z.string(),
         }),
      ),
   });

export const PublicStudyClubListResponseSchema =
   StudyClubListResponseSchema.extend({
      data: z.array(PublicStudyClubSessionSchema),
   });
