import { Request, Response } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import { CompleteProfileSchema, GetUserSchema } from './registSchema.js';
import { registService } from './registService.js';
import { registRepository } from './registRepository.js';
import { sendOutlookVerificationEmail } from '@/utils/mailer.js';

export const completeProfile = async (req: Request, res: Response) => {
   const data = req.body;
   const userData = res.locals.user;
   const validation = CompleteProfileSchema.safeParse(data);

   if (!validation.success) {
      return res.status(400).json({ errors: validation.error.format() });
   }

   const { user, verificationSent } = await registService.completeProfile(
      validation.data,
      userData.id as string,
      userData,
   );
   res.status(200).json({
      msg: 'success',
      ...(verificationSent && {
         notice: `Verification email has been sent to ${user.outlookEmail}`,
      }),
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

   const verification = await registRepository.findVerification(token);

   if (!verification || verification.expiresAt < new Date()) {
      return res.status(400).json({
         msg: 'Link has expired or invalid',
      });
   }

   const [userId, email] = verification.identifier
      .replace('outlook_verify_', '')
      .split(':');

   if (!userId || !email) {
      return res.status(400).json({ msg: 'Link has expired or invalid' });
   }

   const result = await registRepository.updateVerifStatus(userId, email);
   await registRepository.deleteToken(verification.id);

   if (result.count === 0) {
      return res.status(400).json({ msg: 'Email has changed; request a new link' });
   }

   res.status(200).json({
      msg: 'Your Outlook Email has been verified',
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

export const getRegistrationOptions = async (_req: Request, res: Response) => {
   const [universities, studyPrograms, binusRegions] = await registRepository.findOptions();
   res.status(200).json({ msg: 'success', data: { universities, studyPrograms, binusRegions } });
};

export const sendOutlookVerification = async (req: Request, res: Response) => {
   const email = z
      .string()
      .trim()
      .toLowerCase()
      .email()
      .refine(
         (value) =>
            value.endsWith('@binus.ac.id') || value.endsWith('@binus.edu'),
         'Email must use @binus.ac.id or @binus.edu',
      )
      .parse(req.body?.email);
   const user = res.locals.user;
   const token = crypto.randomBytes(32).toString('hex');
   await registRepository.verifyOutlook(user.id, email, token);
   const verifyLink = `${process.env.FRONTEND_URL}/verify-outlook?token=${token}`;
   await sendOutlookVerificationEmail(email, verifyLink);
   res.status(200).json({ msg: 'Verification email sent' });
};
