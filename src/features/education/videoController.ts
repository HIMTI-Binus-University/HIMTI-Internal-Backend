import type { Request, Response } from 'express';
import { CreateVideoSchema, UpdateVideoSchema, VideoIdParamsSchema, VideoListQuerySchema } from './videoSchema.js';
import { videoService } from './videoService.js';

export const listVideos = async (req: Request, res: Response) => {
   const query = VideoListQuerySchema.parse(req.query);
   res.json(await videoService.list(query));
};

export const getVideo = async (req: Request, res: Response) => {
   const { videoId } = VideoIdParamsSchema.parse(req.params);
   res.json({ data: await videoService.get(videoId) });
};

export const createVideo = async (req: Request, res: Response) => {
   const body = CreateVideoSchema.parse(req.body);
   const created = await videoService.create(body);
   res.status(201).json({ data: created });
};

export const updateVideo = async (req: Request, res: Response) => {
   const { videoId } = VideoIdParamsSchema.parse(req.params);
   const body = UpdateVideoSchema.parse(req.body);
   const updated = await videoService.update(videoId, body);
   res.json({ data: updated });
};

export const deleteVideo = async (req: Request, res: Response) => {
   const { videoId } = VideoIdParamsSchema.parse(req.params);
   await videoService.delete(videoId);
   res.status(204).send();
};
