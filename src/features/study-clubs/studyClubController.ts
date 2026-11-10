import type { Request, Response } from 'express';
import {
   CreateStudyClubSchema,
   StudyClubIdParamSchema,
   StudyClubListQuerySchema,
   UpdateStudyClubSchema,
} from './studyClubSchema.js';
import { studyClubService as service } from './studyClubService.js';

export const listStudyClubs = async (req: Request, res: Response) => {
   res.json(await service.list(StudyClubListQuerySchema.parse(req.query)));
};

export const getStudyClub = async (req: Request, res: Response) => {
   const { sessionId } = StudyClubIdParamSchema.parse(req.params);
   res.json({ data: await service.get(sessionId) });
};

export const createStudyClub = async (req: Request, res: Response) => {
   const body = CreateStudyClubSchema.parse(req.body);
   const session = await service.create(body, res.locals.user.id);
   res.status(201).json({ data: session });
};

export const updateStudyClub = async (req: Request, res: Response) => {
   const { sessionId } = StudyClubIdParamSchema.parse(req.params);
   const body = UpdateStudyClubSchema.parse(req.body);
   const session = await service.update(sessionId, body, res.locals.user.id);
   res.json({ data: session });
};
