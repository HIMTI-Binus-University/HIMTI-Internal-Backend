import { Request, Response } from 'express';
import { CompleteProfileSchema } from './registSchema.js';
import { registService } from './registService.js';

export const completeProfile = async (req: Request, res: Response) => {
   const data = req.body;
   const userData = res.locals.user;
   const validation = CompleteProfileSchema.safeParse(data);

   if (!validation.success) {
      return res.status(400).json({ errors: validation.error.format() });
   }

   const result = await registService.completeProfile(
      validation.data,
      userData.id as string,
      userData,
   );
   res.status(200).json({
      msg: 'success',
      data: result,
   });
};
