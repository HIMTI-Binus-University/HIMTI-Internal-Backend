import type { Request, Response } from 'express';
import { eventPackageService } from './eventPackageService.js';
import {
   createEventPackageSchema,
   eventPackageParamsSchema,
   subEventPackageParamsSchema,
   updateEventPackageSchema,
} from './eventPackageSchema.js';

export const listEventPackages = async (req: Request, res: Response) => {
   const { subEventId } = subEventPackageParamsSchema.parse(req.params);
   const data = await eventPackageService.list(subEventId, res.locals.user);
   res.status(200).json({ msg: 'success', data });
};

export const createEventPackage = async (req: Request, res: Response) => {
   const { subEventId } = subEventPackageParamsSchema.parse(req.params);
   const data = await eventPackageService.create(
      subEventId,
      res.locals.user,
      createEventPackageSchema.parse(req.body),
   );
   res.status(201).json({ msg: 'success', data });
};

export const updateEventPackage = async (req: Request, res: Response) => {
   const { packageId } = eventPackageParamsSchema.parse(req.params);
   const data = await eventPackageService.update(
      packageId,
      res.locals.user,
      updateEventPackageSchema.parse(req.body),
   );
   res.status(200).json({ msg: 'success', data });
};
