import { Request, Response } from 'express';
import {
   CreatePermissionSchema,
   DeletePermissionSchema,
   GetPermissionSchema,
   UpdatePermissionSchema,
} from './permissionSchema.js';
import { permissionService } from './permissionService.js';

export const getPermissions = async (req: Request, res: Response) => {
   const query = GetPermissionSchema.parse(req.query);
   const result = await permissionService.getPermissions(query);
   res.status(200).json({
      msg: 'success',
      ...result,
   });
};

export const createPermission = async (req: Request, res: Response) => {
   const data = req.body;
   const userData = res.locals.user;
   const validation = CreatePermissionSchema.safeParse(data);

   if (!validation.success) {
      return res.status(400).json({ errors: validation.error.format() });
   }

   const result = await permissionService.createPermission(
      validation.data,
      userData,
   );
   res.status(200).json({
      msg: 'success',
      data: result,
   });
};

export const updatePermission = async (req: Request, res: Response) => {
   const data = req.body;
   const { id } = req.params;
   const validation = UpdatePermissionSchema.safeParse(data);
   if (!validation.success) {
      return res.status(400).json({ errors: validation.error.format() });
   }
   const result = await permissionService.updatePermission(
      validation.data,
      id as string,
   );
   res.status(200).json({
      msg: 'success',
      data: result,
   });
};

export const deletePermission = async (req: Request, res: Response) => {
   const data = req.body;
   const { id } = req.params;
   const validation = DeletePermissionSchema.safeParse(data);
   if (!validation.success) {
      return res.status(400).json({ errors: validation.error.format() });
   }
   const result = await permissionService.deletePermission(
      validation.data,
      id as string,
   );
   res.status(200).json({
      msg: 'success',
      data: result,
   });
};
