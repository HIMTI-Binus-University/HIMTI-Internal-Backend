import { z } from 'zod';
import {
   CourseGroupIdParamSchema,
   CourseGroupListSchema,
   CourseGroupSchema,
   CreateCourseGroupSchema,
   CreateResponsiSchema,
   ResponsiDetailSchema,
   ResponsiIdParamSchema,
   ResponsiListQuerySchema,
   ResponsiStatusEnum,
   ResponsiSummarySchema,
   ResponsiVersionSchema,
   UpdateCourseGroupSchema,
   UpdateResponsiSchema,
} from './educationSchema.js';

export type CourseGroupList = z.infer<typeof CourseGroupListSchema>;
export type CreateCourseGroup = z.infer<typeof CreateCourseGroupSchema>;
export type UpdateCourseGroup = z.infer<typeof UpdateCourseGroupSchema>;
export type CourseGroupIdParam = z.infer<typeof CourseGroupIdParamSchema>;
export type CourseGroupResponse = z.infer<typeof CourseGroupSchema>;

export type ResponsiStatus = z.infer<typeof ResponsiStatusEnum>;
export type ResponsiListQuery = z.infer<typeof ResponsiListQuerySchema>;
export type ResponsiIdParam = z.infer<typeof ResponsiIdParamSchema>;
export type CreateResponsi = z.infer<typeof CreateResponsiSchema>;
export type UpdateResponsi = z.infer<typeof UpdateResponsiSchema>;
export type ResponsiSummary = z.infer<typeof ResponsiSummarySchema>;
export type ResponsiDetail = z.infer<typeof ResponsiDetailSchema>;
export type ResponsiVersion = z.infer<typeof ResponsiVersionSchema>;
