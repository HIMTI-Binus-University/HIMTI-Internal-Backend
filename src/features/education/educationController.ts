import { z } from 'zod';
import type { Request, Response } from 'express';
import {
   CourseGroupIdParamSchema,
   CourseGroupListSchema,
   CreateCourseGroupSchema,
   CreateResponsiSchema,
   ResponsiEditorsSchema,
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
   const created = await service.createResponsi(
      body,
      await service.summaryActor(res.locals.user.id),
   );
   res.status(201).json({ data: created });
};

export const updateResponsi = async (req: Request, res: Response) => {
   const { responsiId } = ResponsiIdParamSchema.parse(req.params);
   const body = UpdateResponsiSchema.parse(req.body);
   const updated = await service.updateResponsi(
      responsiId,
      body,
      await service.summaryActor(res.locals.user.id),
   );
   res.json({ data: updated });
};

export const deleteResponsi = async (req: Request, res: Response) => {
   const { responsiId } = ResponsiIdParamSchema.parse(req.params);
   const result = await service.deleteResponsi(
      responsiId,
      await service.summaryActor(res.locals.user.id),
   );
   res.json(result);
};

export const listResponsiVersions = async (req: Request, res: Response) => {
   const { responsiId } = ResponsiIdParamSchema.parse(req.params);
   const versions = await service.listResponsiVersions(responsiId);
   res.json({ data: versions });
};

export const restoreResponsiVersion = async (req: Request, res: Response) => {
   const { responsiId } = ResponsiIdParamSchema.parse(req.params);
   const versionId = z.string().min(1).parse(req.params.versionId);
   const data = await service.restoreResponsiVersion(
      responsiId,
      versionId,
      await service.summaryActor(res.locals.user.id),
   );
   res.json({ data });
};

export const approveResponsi = async (req: Request, res: Response) => {
   const { responsiId } = ResponsiIdParamSchema.parse(req.params);
   const result = await service.approveResponsi(
      responsiId,
      await service.summaryActor(res.locals.user.id),
   );
   res.json({ data: result });
};

export const assignResponsiEditors = async (req: Request, res: Response) => {
   const { responsiId } = ResponsiIdParamSchema.parse(req.params);
   const { editorIds } = ResponsiEditorsSchema.parse(req.body);
   const result = await service.assignResponsiEditors(
      responsiId,
      editorIds,
      await service.summaryActor(res.locals.user.id),
   );
   res.json({ data: result });
};

export const listResponsiEditorCandidates = async (
   req: Request,
   res: Response,
) => {
   const search = z.string().trim().min(2).max(100).parse(req.query.search);
   const actor = await service.summaryActor(res.locals.user.id);
   res.json({ data: await service.findEditorCandidates(search, actor) });
};
