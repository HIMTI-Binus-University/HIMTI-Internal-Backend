import { Request, Response } from 'express';
import {
   CompleteProfileSchema,
   GetUserSchema,
   SendVerificationSchema,
} from './registSchema.js';
import { registService } from './registService.js';

export const completeProfile = async (req: Request, res: Response) => {
   const data = req.body;
   const userData = res.locals.user;
   const validation = CompleteProfileSchema.safeParse(data);

   if (!validation.success) {
      return res.status(400).json({ errors: validation.error.format() });
   }

   let user;
   try {
      user = await registService.completeProfile(
         validation.data,
         userData.id as string,
         userData,
      );
   } catch (error) {
      return res.status(400).json({
         message: 'validation_failed',
         errors: { registration: (error as Error).message },
      });
   }
   res.status(200).json({
      message: 'registration_complete',
      data: user,
   });
};

export const verifyOutlookEmail = async (req: Request, res: Response) => {
   const { token } = req.query;

   if (!token || typeof token !== 'string') {
      return res.status(400).json({
         msg: 'Token not valid or not found',
      });
   }

   const verification = await registService.verify(token);
   if (!verification) {
      return res.status(400).json({
         msg: 'Link has expired or invalid',
      });
   }

   res.status(200).json({
      message: 'email_verified',
      email: verification.email,
   });
};

export const sendVerification = async (req: Request, res: Response) => {
   const validation = SendVerificationSchema.safeParse(req.body);
   if (!validation.success)
      return res.status(400).json({ errors: validation.error.format() });
   try {
      await registService.sendVerification(
         res.locals.user.id,
         validation.data.email,
      );
   } catch (error) {
      return res.status(400).json({
         message: 'validation_failed',
         errors: { email: (error as Error).message },
      });
   }
   res.status(202).json({
      message: 'verification_sent',
      email: validation.data.email.toLowerCase(),
   });
};

export const getOptions = async (_req: Request, res: Response) => {
   res.status(200).json({
      msg: 'success',
      data: await registService.getOptions(),
   });
};

export const getUserById = async (req: Request, res: Response) => {
   const id = res.locals.user.id;
   const data = await registService.getUserById(id);

   if (!data) {
      return res.status(404).json({
         msg: 'User not found',
      });
   }

   const validatedData = GetUserSchema.parse(data);

   res.status(200).json({
      msg: 'success',
      ...validatedData,
   });
};
