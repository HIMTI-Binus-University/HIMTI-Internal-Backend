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
