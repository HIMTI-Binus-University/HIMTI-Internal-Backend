import { Request, Response } from 'express';
import { CompleteProfileSchema } from './registSchema.js';

export const completeProfile = async (req: Request, res: Response) => {
   const data = req.body;
   const userData = res.locals.user;
   const validation = CompleteProfileSchema.safeParse(data);

   if (!validation.success) {
      return res.status(400).json({ errors: validation.error.format() });
   }
};
