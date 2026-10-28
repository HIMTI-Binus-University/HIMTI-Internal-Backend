import { z } from 'zod';
import {
   CourseGroupIdParamSchema,
   CourseGroupListSchema,
   CourseGroupSchema,
   CreateCourseGroupSchema,
   UpdateCourseGroupSchema,
} from './educationSchema.js';

export type CourseGroupList = z.infer<typeof CourseGroupListSchema>;
export type CreateCourseGroup = z.infer<typeof CreateCourseGroupSchema>;
export type UpdateCourseGroup = z.infer<typeof UpdateCourseGroupSchema>;
export type CourseGroupIdParam = z.infer<typeof CourseGroupIdParamSchema>;
export type CourseGroupResponse = z.infer<typeof CourseGroupSchema>;
