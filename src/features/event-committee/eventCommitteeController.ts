import type { Request, Response } from 'express';
import {
   AssignEventCommitteeSchema,
   RemoveEventCommitteeSchema,
   UpdateEventCommitteeSchema,
} from './eventCommitteeSchema.js';
import { eventCommitteeService } from './eventCommitteeService.js';

export const getEventCommittee = async (req: Request, res: Response) => {
   const { eventId } = req.params;
   const result = await eventCommitteeService.getCommitteeByEvent(
      eventId as string,
      res.locals.user,
   );

   res.status(200).json({
      msg: 'success',
      data: result,
   });
};

export const assignEventCommittee = async (req: Request, res: Response) => {
   const validation = AssignEventCommitteeSchema.safeParse(req.body);

   if (!validation.success) {
      return res.status(400).json({ errors: validation.error.format() });
   }

   const result = await eventCommitteeService.assignCommitteeMember(
      validation.data,
      res.locals.user,
   );

   res.status(201).json({
      msg: 'success',
      data: result,
   });
};

export const updateEventCommittee = async (req: Request, res: Response) => {
   const validation = UpdateEventCommitteeSchema.safeParse(req.body);

   if (!validation.success) {
      return res.status(400).json({ errors: validation.error.format() });
   }

   const result = await eventCommitteeService.updateCommitteeMember(
      validation.data,
      res.locals.user,
   );

   res.status(200).json({
      msg: 'success',
      data: result,
   });
};

export const removeEventCommittee = async (req: Request, res: Response) => {
   const validation = RemoveEventCommitteeSchema.safeParse(req.body);

   if (!validation.success) {
      return res.status(400).json({ errors: validation.error.format() });
   }

   await eventCommitteeService.removeCommitteeMember(
      validation.data,
      res.locals.user,
   );

   res.status(200).json({
      msg: 'success',
   });
};
