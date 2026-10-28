import { z } from 'zod';

export const CourseGroupListSchema = z.object({
   search: z.string().trim().optional(),
});

export const CreateCourseGroupSchema = z.object({
   name: z.string().trim().min(1, 'Course name is required').max(255),
   code: z.string().trim().max(50).optional().nullable(),
});

export const UpdateCourseGroupSchema = z.object({
   name: z.string().trim().min(1, 'Course name is required').max(255).optional(),
   code: z.string().trim().max(50).optional().nullable(),
   status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});

export const CourseGroupIdParamSchema = z.object({
   courseId: z.string().min(1),
});

export const CourseGroupSchema = z.object({
   id: z.string(),
   name: z.string(),
   code: z.string().nullable(),
   status: z.enum(['ACTIVE', 'INACTIVE']),
});

export const CourseGroupSingleResponseSchema = z.object({
   data: CourseGroupSchema,
});

export const CourseGroupListResponseSchema = z.object({
   data: z.array(CourseGroupSchema),
});
