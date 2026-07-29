import { Request, Response } from 'express';
import {
   CompleteProfileSchema,
   CurrentUserSchema,
   GetUserSchema,
   OutlookEmailSchema,
   OutlookVerificationQuerySchema,
   UpdateProfileSchema,
   UpdateUserSchema,
} from './userSchema.js';
import { userService } from './userService.js';

export const getUsers = async (req: Request, res: Response) => {
   const query = GetUserSchema.parse(req.query);
   const userData = res.locals.user;
   const result = await userService.getUsers(query, userData);
   res.status(200).json({
      msg: 'success',
      ...result,
   });
};

export const getUserById = async (req: Request, res: Response) => {
   const { id } = req.params;
   const result = await userService.getUserById(id as string);
   if (!result) {
      return res.status(404).json({ msg: 'User not found' });
   }
   res.status(200).json({
      msg: 'success',
      data: result,
   });
};

export const updateUser = async (req: Request, res: Response) => {
   const data = req.body;
   const { id } = req.params;
   const userData = res.locals.user;

   const validation = UpdateUserSchema.safeParse(data);
   if (!validation.success) {
      return res.status(400).json({ errors: validation.error.format() });
   }

   const result = await userService.updateUser(validation.data, id, userData);
   res.status(200).json({
      msg: 'success',
      data: result,
   });
};

export const getUserSummary = async (req: Request, res: Response) => {
   const query = GetUserSchema.parse(req.query);
   const result = await userService.getSummary(query, res.locals.user);
   res.status(200).json({ msg: 'success', data: result });
};

export const exportUsers = async (req: Request, res: Response) => {
   const query = GetUserSchema.parse(req.query);
   const csv = await userService.exportUsers(query, res.locals.user);
   res.setHeader('Content-Type', 'text/csv; charset=utf-8');
   res.setHeader('Content-Disposition', 'attachment; filename="users.csv"');
   res.status(200).send(csv);
};

export const resendUserVerification = async (req: Request, res: Response) => {
   await userService.resendVerification(req.params.id as string);
   res.status(200).json({ msg: 'Verification email sent' });
};

export const getCurrentUser = async (_req: Request, res: Response) => {
   const result = await userService.getCurrentUser(res.locals.user.id);
   if (!result) return res.status(404).json({ msg: 'User not found' });

   res.status(200).json({
      msg: 'success',
      ...CurrentUserSchema.parse(result),
   });
};

export const updateProfile = async (req: Request, res: Response) => {
   const validation = UpdateProfileSchema.safeParse(req.body);
   if (!validation.success) {
      return res.status(400).json({ errors: validation.error.format() });
   }

   const result = await userService.updateProfile(
      validation.data,
      res.locals.user.id,
   );
   res.status(200).json({ msg: 'success', data: result });
};

export const completeProfile = async (req: Request, res: Response) => {
   const validation = CompleteProfileSchema.safeParse(req.body);
   if (!validation.success) {
      return res.status(400).json({ errors: validation.error.format() });
   }

   const result = await userService.completeProfile(
      validation.data,
      res.locals.user.id,
   );
   res.status(200).json({ msg: 'success', data: result });
};

export const reregister = async (req: Request, res: Response) => {
   const validation = CompleteProfileSchema.safeParse(req.body);
   if (!validation.success) {
      return res.status(400).json({ errors: validation.error.format() });
   }

   const result = await userService.reregister(
      validation.data,
      res.locals.user.id,
   );
   res.status(200).json({ msg: 'success', data: result });
};

export const getRegistrationOptions = async (_req: Request, res: Response) => {
   const result = await userService.getRegistrationOptions();
   res.status(200).json({ msg: 'success', data: result });
};

export const sendOutlookVerification = async (req: Request, res: Response) => {
   const { email } = OutlookEmailSchema.parse(req.body);
   await userService.sendOutlookVerification(res.locals.user.id, email);
   res.status(200).json({ msg: 'Verification email sent' });
};

export const verifyOutlookEmail = async (req: Request, res: Response) => {
   const { token } = OutlookVerificationQuerySchema.parse(req.query);
   await userService.verifyOutlookEmail(token);
   res.status(200).json({ msg: 'Your Outlook Email has been verified' });
};
