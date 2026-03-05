import { Request, Response } from 'express';
import { CompleteProfileSchema, GetUserSchema } from './registSchema.js';
import { registService } from './registService.js';
import { registRepository } from './registRepository.js';

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

export const verifyOutlookEmail = async (req: Request, res: Response) => {
   const { token } = req.query;

   if (!token || typeof token !== 'string') {
      return res.status(400).json({
         msg: 'Token not valid or not found',
      });
   }

   const verification = await registRepository.findVerification(token);

   if (!verification || verification.expiresAt < new Date()) {
      return res.status(400).json({
         msg: 'Link has expired or invalid',
      });
   }

   const userId = verification.identifier.replace('outlook_verify_', '');

   // Update verification status
   await registRepository.updateVerifStatus(userId);
   // Delete token
   await registRepository.deleteToken(verification.id);

   res.status(200).json({
      msg: 'Your Outlook Email has been verified',
   });
};

export const getUserById = async (req: Request, res: Response) => {
   const id = res.locals.user.id;
   const data = await registService.getUserById(id);

   if (!data) {
      res.status(404).json({
         msg: 'User not found',
      });
   }

   const validatedData = GetUserSchema.parse(data);

   res.status(200).json({
      msg: 'success',
      ...validatedData,
   });
};
