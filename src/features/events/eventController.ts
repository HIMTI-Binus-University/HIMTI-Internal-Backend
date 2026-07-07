import { Request, Response } from 'express';
import { CreateEventSchema, GetEventSchema } from './eventSchema.js';
import { eventService } from './eventService.js';

export const getEvents = async (req: Request, res: Response) => {
   const query = GetEventSchema.parse(req.query);
   const userData = res.locals.user;
   const result = await eventService.getEvents(query, userData);

   res.status(200).json({
      msg: 'success',
      ...result,
   });
};

export const createEvent = async (req: Request, res: Response) => {
   const data = req.body;
   const userData = res.locals.user;
   const validation = CreateEventSchema.safeParse(data);

   if (!validation.success) {
      return res.status(400).json({ errors: validation.error.format() });
   }

   const result = await eventService.createEvent(validation.data, userData);
   res.status(200).json({
      msg: 'success',
      data: result,
   });
};
