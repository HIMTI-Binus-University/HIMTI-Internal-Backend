import type { Request, Response } from 'express';
import {
   CreateEventPackageSchema,
   UpdateEventPackageSchema,
} from './eventPackageSchema.js';
import { eventPackageService as service } from './eventPackageService.js';

const ids = (req: Request) => ({
   eventId: req.params.eventId as string,
   packageId: req.params.packageId as string,
});
export const listEventPackages = async (req: Request, res: Response) =>
   res.json({ data: await service.list(ids(req).eventId, res.locals.user) });
export const getEventPackage = async (req: Request, res: Response) => {
   const { eventId, packageId } = ids(req);
   res.json({ data: await service.get(eventId, packageId, res.locals.user) });
};
export const createEventPackage = async (req: Request, res: Response) =>
   res.status(201).json({
      data: await service.create(
         ids(req).eventId,
         CreateEventPackageSchema.parse(req.body),
         res.locals.user,
      ),
   });
export const updateEventPackage = async (req: Request, res: Response) => {
   const { eventId, packageId } = ids(req);
   res.json({
      data: await service.update(
         eventId,
         packageId,
         UpdateEventPackageSchema.parse(req.body),
         res.locals.user,
      ),
   });
};
export const setEventPackageStatus = (active: boolean) =>
   async function status(req: Request, res: Response) {
      const { eventId, packageId } = ids(req);
      res.json({
         data: await service.status(
            eventId,
            packageId,
            active,
            res.locals.user,
         ),
      });
   };
