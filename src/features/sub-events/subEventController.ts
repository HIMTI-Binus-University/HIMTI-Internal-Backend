import { Request, Response } from 'express';
import {
   CreateSubEventSchema,
   DeleteSubEventSchema,
   UpdateSubEventSchema,
} from './subEventSchema.js';
import { subEventService } from './subEventService.js';

export const createSubEvent = async (req: Request, res: Response) => {
   const data = req.body;
   const userData = res.locals.user;
   const validation = CreateSubEventSchema.safeParse(data);

   if (!validation.success) {
      return res.status(400).json({ errors: validation.error.format() });
   }

   const result = await subEventService.createSubEvent(
      validation.data,
      userData,
   );
   res.status(200).json({
      msg: 'success',
      data: result,
   });
};

export const updateSubEvent = async (req: Request, res: Response) => {
   const data = req.body;
   const { id } = req.params;
   const userData = res.locals.user;
   const validation = UpdateSubEventSchema.safeParse(data);

   if (!validation.success) {
      return res.status(400).json({ errors: validation.error.format() });
   }

   const result = await subEventService.updateSubEvent(
      validation.data,
      id as string,
      userData,
   );
   res.status(200).json({
      msg: 'success',
      data: result,
   });
};

export const deleteSubEvent = async (req: Request, res: Response) => {
   const { id } = req.params;
   const userData = res.locals.user;
   const validation = DeleteSubEventSchema.safeParse(req.body ?? {});

   if (!validation.success) {
      return res.status(400).json({ errors: validation.error.format() });
   }

   const result = await subEventService.deleteSubEvent(id as string, userData);
   res.status(200).json({
      msg: 'success',
      data: result,
   });
};
