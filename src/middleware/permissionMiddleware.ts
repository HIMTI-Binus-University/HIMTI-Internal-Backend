import { Request, Response, NextFunction } from 'express';
import { prisma } from '@/config/prisma.js';

export const requirePermission = (permissionName: string) => {
   return async (_req: Request, res: Response, next: NextFunction) => {
      const user = res.locals.user;
      const userWithPermission = await prisma.user.findFirst({
         where: {
            id: user.id,
            status: 'ACTIVE',
            userHasRoles: {
               some: {
                  role: {
                     status: 'ACTIVE',
                     roleHasPermissions: {
                        some: {
                           permission: {
                              name: permissionName,
                              status: 'ACTIVE',
                           },
                        },
                     },
                  },
               },
            },
         },
      });

      if (!userWithPermission) {
         const message = 'You do not have permission to access this feature.';
         return res.status(403).json({
            success: false,
            status: 'fail',
            code: 'PERMISSION_DENIED',
            message,
            msg: message,
         });
      }

      next();
   };
};

export const requirePermissionOrRole = (
   permissionName: string,
   roleName: string,
) => {
   return async (_req: Request, res: Response, next: NextFunction) => {
      const user = res.locals.user;
      const authorizedUser = await prisma.user.findFirst({
         where: {
            id: user.id,
            status: 'ACTIVE',
            userHasRoles: {
               some: {
                  role: {
                     status: 'ACTIVE',
                     OR: [
                        { roleName },
                        {
                           roleHasPermissions: {
                              some: {
                                 permission: {
                                    name: permissionName,
                                    status: 'ACTIVE',
                                 },
                              },
                           },
                        },
                     ],
                  },
               },
            },
         },
      });

      if (!authorizedUser) {
         const message = 'You do not have permission to access this feature.';
         return res.status(403).json({
            success: false,
            status: 'fail',
            code: 'PERMISSION_DENIED',
            message,
            msg: message,
         });
      }

      next();
   };
};
