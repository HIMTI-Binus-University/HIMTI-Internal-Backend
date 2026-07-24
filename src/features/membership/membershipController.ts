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

export const getMembershipStatus = async (_req: Request, res: Response) => {
   const result = await membershipService.getStatus(res.locals.user.id);
   res.status(200).json({ msg: 'success', data: result });
};

export const getMembershipResources = async (_req: Request, res: Response) => {
   const result = await membershipService.getMembershipResources(
      res.locals.user.id,
   );
   res.status(200).json({ msg: 'success', data: result });
};

export const listPeriods = async (_req: Request, res: Response) => {
   const result = await membershipService.listPeriods();
   res.status(200).json({ msg: 'success', data: result });
};

export const createPeriod = async (req: Request, res: Response) => {
   const validation = CreatePeriodSchema.parse(req.body);
   const result = await membershipService.createPeriod(validation);
   res.status(201).json({ msg: 'success', data: result });
};

export const updatePeriod = async (req: Request, res: Response) => {
   const { periodId } = PeriodParamsSchema.parse(req.params);
   const { label } = UpdatePeriodSchema.parse(req.body);
   const result = await membershipService.updatePeriod(periodId, label);
   res.status(200).json({ msg: 'success', data: result });
};

export const deletePeriod = async (req: Request, res: Response) => {
   const { periodId } = PeriodParamsSchema.parse(req.params);
   await membershipService.deletePeriod(periodId);
   res.status(204).send();
};

export const activatePeriod = async (req: Request, res: Response) => {
   const { periodId } = PeriodParamsSchema.parse(req.params);
   const result = await membershipService.activatePeriod(periodId);
   res.status(200).json({ msg: 'success', data: result });
};

export const setRegistrationOpen = async (req: Request, res: Response) => {
   const { periodId } = PeriodParamsSchema.parse(req.params);
   const { open } = RegistrationOpenSchema.parse(req.body);
   const result = await membershipService.setRegistrationOpen(periodId, open);
   res.status(200).json({ msg: 'success', data: result });
};

export const listResources = async (req: Request, res: Response) => {
   const { periodId } = PeriodParamsSchema.parse(req.params);
   const result = await membershipService.listResources(periodId);
   res.status(200).json({ msg: 'success', data: result });
};

export const createResource = async (req: Request, res: Response) => {
   const { periodId } = PeriodParamsSchema.parse(req.params);
   const validation = CreateResourceSchema.parse(req.body);
   const result = await membershipService.createResource(periodId, validation);
   res.status(201).json({ msg: 'success', data: result });
};

export const updateResource = async (req: Request, res: Response) => {
   const { resourceId } = ResourceParamsSchema.parse(req.params);
   const validation = UpdateResourceSchema.parse(req.body);
   const result = await membershipService.updateResource(
      resourceId,
      validation,
   );
   res.status(200).json({ msg: 'success', data: result });
};

export const deleteResource = async (req: Request, res: Response) => {
   const { resourceId } = ResourceParamsSchema.parse(req.params);
   await membershipService.deleteResource(resourceId);
   res.status(204).send();
};

export const reorderResources = async (req: Request, res: Response) => {
   const { periodId } = PeriodParamsSchema.parse(req.params);
   const { resourceIds } = ResourceOrderSchema.parse(req.body);
   const result = await membershipService.reorderResources(
      periodId,
      resourceIds,
   );
   res.status(200).json({ msg: 'success', data: result });
};
