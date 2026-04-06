import { Request, Response } from 'express';
import { CreateSubEventSchema } from './subEventSchema.js';
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
