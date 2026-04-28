import { Request, Response } from 'express';
import { GetUserSchema, UpdateUserSchema } from './userSchema.js';
import { userService } from './userService.js';

export const getUsers = async (req: Request, res: Response) => {
   const query = GetUserSchema.parse(req.query);
   const result = await userService.getUsers(query);
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
