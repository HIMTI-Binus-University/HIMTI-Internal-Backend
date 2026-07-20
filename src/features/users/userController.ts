import { Request, Response } from 'express';
import {
   ManageRegistrationsQuerySchema,
   ManageRegistrationUpdateSchema,
} from './userSchema.js';
import { userService } from './userService.js';

export const getUsers = async (req: Request, res: Response) => {
   const result = await userService.getRegistrations(
      ManageRegistrationsQuerySchema.parse(req.query),
   );
   res.status(200).json({ msg: 'success', ...result });
};

export const getUserSummary = async (_req: Request, res: Response) => {
   res.status(200).json({
      msg: 'success',
      data: await userService.getRegistrationSummary(),
   });
};

export const exportUsers = async (req: Request, res: Response) => {
   const csv = await userService.exportRegistrations(
      ManageRegistrationsQuerySchema.parse(req.query),
   );
   res.set({
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="registrations.csv"',
   })
      .status(200)
      .send(`\uFEFF${csv}`);
};

export const getUserById = async (req: Request, res: Response) => {
   const data = await userService.getRegistrationById(req.params.id as string);
   if (!data) return res.status(404).json({ msg: 'User not found' });
   res.status(200).json({ msg: 'success', data });
};

export const updateUser = async (req: Request, res: Response) => {
   const data = await userService.updateRegistration(
      req.params.id as string,
      ManageRegistrationUpdateSchema.parse(req.body),
      res.locals.user.id,
   );
   if (!data) return res.status(404).json({ msg: 'User not found' });
   res.status(200).json({ msg: 'success', data });
};

export const resendUserVerification = async (req: Request, res: Response) => {
   const sent = await userService.resendRegistrationVerification(
      req.params.id as string,
   );
   if (sent === null) return res.status(404).json({ msg: 'User not found' });
   if (!sent)
      return res.status(409).json({ msg: 'Verification is not required' });
   res.status(200).json({ msg: 'Verification email sent' });
};
