import type { Request, Response } from 'express';
import {
   CourseGroupIdParamSchema,
   CourseGroupListSchema,
   CreateCourseGroupSchema,
   UpdateCourseGroupSchema,
} from './educationSchema.js';
import { educationService as service } from './educationService.js';

export const listCourseGroups = async (req: Request, res: Response) => {
   const query = CourseGroupListSchema.parse(req.query);
   res.json({ data: await service.listCourseGroups(query) });
};

export const getCourseGroup = async (req: Request, res: Response) => {
   const { courseId } = CourseGroupIdParamSchema.parse(req.params);
   res.json({ data: await service.getCourseGroupById(courseId) });
};

export const createCourseGroup = async (req: Request, res: Response) => {
   const body = CreateCourseGroupSchema.parse(req.body);
   const created = await service.createCourseGroup(body);
   res.status(201).json({ data: created });
};

export const updateCourseGroup = async (req: Request, res: Response) => {
   const { courseId } = CourseGroupIdParamSchema.parse(req.params);
   const body = UpdateCourseGroupSchema.parse(req.body);
   const updated = await service.updateCourseGroup(courseId, body);
   res.json({ data: updated });
};
