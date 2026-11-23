import type { Request, Response } from 'express';
import {
   CourseGroupIdParamSchema,
   CourseGroupListSchema,
   CreateCourseGroupSchema,
   CreateResponsiSchema,
   ResponsiIdParamSchema,
   ResponsiListQuerySchema,
   UpdateCourseGroupSchema,
   UpdateResponsiSchema,
} from './educationSchema.js';
import { educationService as service } from './educationService.js';

// Course Groups
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

// Responsi
export const listResponsies = async (req: Request, res: Response) => {
   const query = ResponsiListQuerySchema.parse(req.query);
   const result = await service.listResponsies(query);
   res.json(result);
};

export const getResponsi = async (req: Request, res: Response) => {
   const { responsiId } = ResponsiIdParamSchema.parse(req.params);
   const result = await service.getResponsiById(responsiId);
   res.json({ data: result });
};

export const createResponsi = async (req: Request, res: Response) => {
   const body = CreateResponsiSchema.parse(req.body);
   const created = await service.createResponsi(body);
   res.status(201).json({ data: created });
};

export const updateResponsi = async (req: Request, res: Response) => {
   const { responsiId } = ResponsiIdParamSchema.parse(req.params);
   const body = UpdateResponsiSchema.parse(req.body);
   const updated = await service.updateResponsi(responsiId, body);
   res.json({ data: updated });
};

export const deleteResponsi = async (req: Request, res: Response) => {
   const { responsiId } = ResponsiIdParamSchema.parse(req.params);
   const result = await service.deleteResponsi(responsiId);
   res.json(result);
};

export const listResponsiVersions = async (req: Request, res: Response) => {
   const { responsiId } = ResponsiIdParamSchema.parse(req.params);
   const versions = await service.listResponsiVersions(responsiId);
   res.json({ data: versions });
};
