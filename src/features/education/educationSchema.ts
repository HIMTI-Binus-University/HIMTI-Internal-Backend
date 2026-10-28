import { z } from 'zod';

export const CourseGroupListSchema = z.object({
   search: z.string().trim().optional(),
});

export const CourseGroupSchema = z.object({
   id: z.string(),
   name: z.string(),
   code: z.string().nullable(),
   status: z.enum(['ACTIVE', 'INACTIVE']),
});

export const CourseGroupListResponseSchema = z.object({
   data: z.array(CourseGroupSchema),
});
