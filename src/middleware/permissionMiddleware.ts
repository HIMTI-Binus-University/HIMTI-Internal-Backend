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
         return res.status(403).json({
            success: false,
            message: `You do not have the permission to access this feature.`,
         });
      }

      next();
   };
};
