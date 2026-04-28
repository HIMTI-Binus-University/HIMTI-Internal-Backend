import { Request, Response } from 'express';
import {
   AssignPermissionToRoleSchema,
   AssignRoleToUserSchema,
   CreateRoleSchema,
   GetRoleSchema,
   RemovePermissionFromRoleSchema,
   RemoveRoleFromUserSchema,
   UpdateRoleSchema,
} from './roleSchema.js';
import { roleService } from './roleService.js';

export const getRoles = async (req: Request, res: Response) => {
   const query = GetRoleSchema.parse(req.query);
   const result = await roleService.getRoles(query);
   res.status(200).json({ msg: 'success', ...result });
};

export const getRoleById = async (req: Request, res: Response) => {
   const { id } = req.params;
   const result = await roleService.getRoleById(id);
   if (!result) {
      return res.status(404).json({ msg: 'Role not found' });
   }
   res.status(200).json({ msg: 'success', data: result });
};

export const createRole = async (req: Request, res: Response) => {
   const userData = res.locals.user;
   const validation = CreateRoleSchema.safeParse(req.body);
   if (!validation.success) {
      return res.status(400).json({ errors: validation.error.format() });
   }
   const result = await roleService.createRole(validation.data, userData);
   res.status(201).json({ msg: 'success', data: result });
};

export const updateRole = async (req: Request, res: Response) => {
   const { id } = req.params;
   const userData = res.locals.user;
   const validation = UpdateRoleSchema.safeParse(req.body);
   if (!validation.success) {
      return res.status(400).json({ errors: validation.error.format() });
   }
   const result = await roleService.updateRole(validation.data, id, userData);
   res.status(200).json({ msg: 'success', data: result });
};

export const assignRoleToUser = async (req: Request, res: Response) => {
   const validation = AssignRoleToUserSchema.safeParse(req.body);
   if (!validation.success) {
      return res.status(400).json({ errors: validation.error.format() });
   }
   const result = await roleService.assignRoleToUser(validation.data);
   res.status(200).json({ msg: 'success', data: result });
};

export const removeRoleFromUser = async (req: Request, res: Response) => {
   const validation = RemoveRoleFromUserSchema.safeParse(req.body);
   if (!validation.success) {
      return res.status(400).json({ errors: validation.error.format() });
   }
   await roleService.removeRoleFromUser(validation.data);
   res.status(200).json({ msg: 'success' });
};

export const assignPermissionToRole = async (req: Request, res: Response) => {
   const validation = AssignPermissionToRoleSchema.safeParse(req.body);
   if (!validation.success) {
      return res.status(400).json({ errors: validation.error.format() });
   }
   const result = await roleService.assignPermissionToRole(validation.data);
   res.status(200).json({ msg: 'success', data: result });
};

export const removePermissionFromRole = async (req: Request, res: Response) => {
   const validation = RemovePermissionFromRoleSchema.safeParse(req.body);
   if (!validation.success) {
      return res.status(400).json({ errors: validation.error.format() });
   }
   await roleService.removePermissionFromRole(validation.data);
   res.status(200).json({ msg: 'success' });
};

//
