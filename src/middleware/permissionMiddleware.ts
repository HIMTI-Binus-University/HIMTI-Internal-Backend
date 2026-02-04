import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const requirePermission = (permissionName: string) => {
   return async (_req: Request, res: Response, next: NextFunction) => {
      const user = res.locals.user;
      const userWithPermission = await prisma.user.findFirst({
         where: {
            id: user.id,
            userHasRoles: {
               some: {
                  role: {
                     roleHasPermissions: {
                        some: {
                           permission: {
                              name: permissionName,
                           },
                        },
                     },
                  },
               },
            },
         },
      });

      console.log(userWithPermission);

      if (!userWithPermission) {
         return res.status(403).json({
            success: false,
            message: `You do not have the permission to access this feature.`,
         });
      }

      next();
   };
};
