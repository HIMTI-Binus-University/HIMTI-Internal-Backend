import type { Request, Response } from 'express';
import {
   CreatePeriodSchema,
   CreateResourceSchema,
   PeriodParamsSchema,
   RegistrationOpenSchema,
   ResourceOrderSchema,
   ResourceParamsSchema,
   UpdatePeriodSchema,
   UpdateResourceSchema,
} from './membershipSchema.js';
import { membershipService } from './membershipService.js';

const success = (res: Response, data: unknown, status = 200) =>
   res.status(status).json({ msg: 'success', data });

export const getMembershipStatus = async (_req: Request, res: Response) =>
   success(res, await membershipService.getStatus(res.locals.user.id));

export const getMembershipResources = async (_req: Request, res: Response) =>
   success(res, await membershipService.getMembershipResources(res.locals.user.id));

export const listPeriods = async (_req: Request, res: Response) =>
   success(res, await membershipService.listPeriods());

export const createPeriod = async (req: Request, res: Response) =>
   success(res, await membershipService.createPeriod(CreatePeriodSchema.parse(req.body)), 201);

export const updatePeriod = async (req: Request, res: Response) => {
   const { periodId } = PeriodParamsSchema.parse(req.params);
   const { label } = UpdatePeriodSchema.parse(req.body);
   return success(res, await membershipService.updatePeriod(periodId, label));
};

export const deletePeriod = async (req: Request, res: Response) => {
   const { periodId } = PeriodParamsSchema.parse(req.params);
   await membershipService.deletePeriod(periodId);
   return res.status(204).send();
};

export const activatePeriod = async (req: Request, res: Response) => {
   const { periodId } = PeriodParamsSchema.parse(req.params);
   return success(res, await membershipService.activatePeriod(periodId));
};

export const setRegistrationOpen = async (req: Request, res: Response) => {
   const { periodId } = PeriodParamsSchema.parse(req.params);
   const { open } = RegistrationOpenSchema.parse(req.body);
   return success(res, await membershipService.setRegistrationOpen(periodId, open));
};

export const listResources = async (req: Request, res: Response) => {
   const { periodId } = PeriodParamsSchema.parse(req.params);
   return success(res, await membershipService.listResources(periodId));
};

export const createResource = async (req: Request, res: Response) => {
   const { periodId } = PeriodParamsSchema.parse(req.params);
   return success(
      res,
      await membershipService.createResource(periodId, CreateResourceSchema.parse(req.body)),
      201,
   );
};

export const updateResource = async (req: Request, res: Response) => {
   const { resourceId } = ResourceParamsSchema.parse(req.params);
   return success(
      res,
      await membershipService.updateResource(resourceId, UpdateResourceSchema.parse(req.body)),
   );
};

export const deleteResource = async (req: Request, res: Response) => {
   const { resourceId } = ResourceParamsSchema.parse(req.params);
   await membershipService.deleteResource(resourceId);
   return res.status(204).send();
};

export const reorderResources = async (req: Request, res: Response) => {
   const { periodId } = PeriodParamsSchema.parse(req.params);
   const { resourceIds } = ResourceOrderSchema.parse(req.body);
   return success(res, await membershipService.reorderResources(periodId, resourceIds));
};
