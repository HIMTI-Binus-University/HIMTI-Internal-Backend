import { z } from 'zod';

export const CourseGroupListSchema = z.object({
   search: z.string().trim().optional(),
});

export const CreateCourseGroupSchema = z.object({
   name: z.string().trim().min(1, 'Course name is required').max(255),
   code: z.string().trim().max(50).optional().nullable(),
   description: z.string().trim().max(2000).optional().nullable(),
});

export const UpdateCourseGroupSchema = z.object({
   name: z.string().trim().min(1, 'Course name is required').max(255).optional(),
   code: z.string().trim().max(50).optional().nullable(),
   description: z.string().trim().max(2000).optional().nullable(),
   status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});

export const CourseGroupIdParamSchema = z.object({
   courseId: z.string().min(1),
});

export const CourseGroupSchema = z.object({
   id: z.string(),
   name: z.string(),
   code: z.string().nullable(),
   description: z.string().nullable().optional(),
   status: z.enum(['ACTIVE', 'INACTIVE']),
});

export const CourseGroupSingleResponseSchema = z.object({
   data: CourseGroupSchema,
});

export const CourseGroupListResponseSchema = z.object({
   data: z.array(CourseGroupSchema),
});

// ==========================================
// RESPONSI SCHEMAS
// ==========================================

export const ResponsiStatusEnum = z.enum([
   'DRAFT',
   'UNDER_REVIEW',
   'PUBLISHED',
   'ARCHIVED',
]);

export const ResponsiExamTypeEnum = z.enum(['Mid Exam', 'Final Exam']);

export const ResponsiListQuerySchema = z.object({
   search: z.string().trim().optional(),
   course: z.string().trim().optional(),
   academicPeriod: z.string().trim().optional(),
   examType: z.string().trim().optional(),
   status: ResponsiStatusEnum.optional(),
   page: z.coerce.number().int().min(1).optional().default(1),
   limit: z.coerce.number().int().min(1).max(100).optional().default(50),
});

export const ResponsiIdParamSchema = z.object({
   responsiId: z.string().min(1),
});

export const CreateResponsiSchema = z.object({
   title: z.string().trim().min(1, 'Title is required').max(255),
   course: z.string().trim().min(1, 'Course is required'),
   academicPeriod: z.string().trim().min(1, 'Academic period is required').max(50),
   examType: ResponsiExamTypeEnum,
   pic: z.string().trim().min(1, 'PIC is required').max(255),
   content: z.string().optional().default(''),
   status: ResponsiStatusEnum.optional().default('DRAFT'),
});

export const UpdateResponsiSchema = z.object({
   title: z.string().trim().min(1).max(255).optional(),
   course: z.string().trim().min(1).optional(),
   academicPeriod: z.string().trim().min(1).max(50).optional(),
   examType: ResponsiExamTypeEnum.optional(),
   pic: z.string().trim().min(1).max(255).optional(),
   content: z.string().optional(),
   status: ResponsiStatusEnum.optional(),
});

export const ResponsiSummarySchema = z.object({
   id: z.string(),
   title: z.string(),
   course: z.string(),
   courseId: z.string(),
   academicPeriod: z.string(),
   examType: z.string(),
   pic: z.string(),
   status: ResponsiStatusEnum,
   lastUpdated: z.string(),
   createdAt: z.string(),
});

export const ResponsiDetailSchema = ResponsiSummarySchema.extend({
   content: z.string(),
   semester: z.number().nullable().optional(),
});

export const ResponsiListResponseSchema = z.object({
   data: z.array(ResponsiSummarySchema),
   pagination: z.object({
      page: z.number(),
      limit: z.number(),
      total: z.number(),
      totalPages: z.number(),
   }),
});

export const ResponsiDetailResponseSchema = z.object({
   data: ResponsiDetailSchema,
});

export const ResponsiVersionSchema = z.object({
   id: z.string(),
   responsiId: z.string(),
   version: z.string(),
   content: z.string(),
   status: ResponsiStatusEnum,
   createdBy: z.string().nullable(),
   createdAt: z.string(),
});

export const ResponsiVersionListResponseSchema = z.object({
   data: z.array(ResponsiVersionSchema),
});
