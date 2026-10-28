import type { Request, Response } from 'express';
import { CourseGroupListSchema } from './educationSchema.js';
import { educationService as service } from './educationService.js';

export const listCourseGroups = async (req: Request, res: Response) => {
   const query = CourseGroupListSchema.parse(req.query);
   res.json({ data: await service.listCourseGroups(query) });
};
