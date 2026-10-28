import { z } from 'zod';
import {
   CourseGroupListSchema,
   CourseGroupSchema,
} from './educationSchema.js';

export type CourseGroupList = z.infer<typeof CourseGroupListSchema>;
export type CourseGroupResponse = z.infer<typeof CourseGroupSchema>;
