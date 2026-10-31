import type { Request, Response } from 'express';
import { CreateVideoSchema, UpdateVideoSchema, VideoIdParamsSchema, VideoListQuerySchema } from './videoSchema.js';
import { videoService } from './videoService.js';

export const listEducationSessions = async (_req: Request, res: Response) =>
   res.json({ data: await videoService.listSessions() });
export const listVideos = async (req: Request, res: Response) =>
   res.json(await videoService.list(VideoListQuerySchema.parse(req.query)));
export const getVideo = async (req: Request, res: Response) =>
   res.json({ data: await videoService.get(VideoIdParamsSchema.parse(req.params).videoId) });
export const createVideo = async (req: Request, res: Response) =>
   res.status(201).json({ data: await videoService.create(CreateVideoSchema.parse(req.body)) });
export const updateVideo = async (req: Request, res: Response) =>
   res.json({ data: await videoService.update(VideoIdParamsSchema.parse(req.params).videoId, UpdateVideoSchema.parse(req.body)) });
export const deleteVideo = async (req: Request, res: Response) => {
   await videoService.delete(VideoIdParamsSchema.parse(req.params).videoId);
   res.status(204).send();
};
