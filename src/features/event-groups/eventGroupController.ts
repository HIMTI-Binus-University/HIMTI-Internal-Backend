import type { Request, Response } from 'express';
import {
   EventGroupBodySchema,
   EventGroupListSchema,
   EventGroupOrganizerSchema,
   EventGroupOrganizerUpdateSchema,
   EventGroupUpdateSchema,
} from './eventGroupSchema.js';
import { eventGroupService as service } from './eventGroupService.js';
export const listPublicEventGroups = async (req: Request, res: Response) =>
   res.json({
      data: await service.listPublic(EventGroupListSchema.parse(req.query)),
   });
export const getPublicEventGroup = async (req: Request, res: Response) =>
   res.json({
      data: await service.getPublic(req.params.eventGroupId as string),
   });
export const listInternalEventGroups = async (req: Request, res: Response) =>
   res.json({
      data: await service.listInternal(
         EventGroupListSchema.parse(req.query),
         res.locals.user,
      ),
   });
export const getInternalEventGroup = async (req: Request, res: Response) =>
   res.json({
      data: await service.scope(
         req.params.eventGroupId as string,
         res.locals.user,
      ),
   });
export const createEventGroup = async (req: Request, res: Response) =>
   res.status(201).json({
      data: await service.create(
         EventGroupBodySchema.parse(req.body),
         res.locals.user,
      ),
   });
export const updateEventGroup = async (req: Request, res: Response) =>
   res.json({
      data: await service.update(
         req.params.eventGroupId as string,
         EventGroupUpdateSchema.parse(req.body),
         res.locals.user,
      ),
   });
export const transitionEventGroup =
   (status: 'PUBLISHED' | 'ARCHIVED') => async (req: Request, res: Response) =>
      res.json({
         data: await service.transition(
            req.params.eventGroupId as string,
            status,
            res.locals.user,
         ),
      });
export const listEventGroupOrganizers = async (req: Request, res: Response) =>
   res.json({
      data: await service.organizers(
         req.params.eventGroupId as string,
         res.locals.user,
      ),
   });
export const addEventGroupOrganizer = async (req: Request, res: Response) => {
   const body = EventGroupOrganizerSchema.parse(req.body);
   res.status(201).json({
      data: await service.addOrganizer(
         req.params.eventGroupId as string,
         body.userId,
         body.role,
         res.locals.user,
      ),
   });
};
export const updateEventGroupOrganizer = async (
   req: Request,
   res: Response,
) => {
   const body = EventGroupOrganizerUpdateSchema.parse(req.body);
   res.json({
      data: await service.updateOrganizer(
         req.params.eventGroupId as string,
         req.params.userId as string,
         body.role,
         res.locals.user,
      ),
   });
};
export const removeEventGroupOrganizer = async (req: Request, res: Response) =>
   res.json({
      data: await service.removeOrganizer(
         req.params.eventGroupId as string,
         req.params.userId as string,
         res.locals.user,
      ),
   });
