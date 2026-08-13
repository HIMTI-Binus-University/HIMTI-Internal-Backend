import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { AppError } from '@/utils/appError.js';

export const globalErrorHandler = (
   err: any,
   _req: Request,
   res: Response,
   // eslint-disable-next-line @typescript-eslint/no-unused-vars
   _next: NextFunction,
) => {
   if (err instanceof ZodError) {
      return res.status(400).json({
         status: 'fail',
         msg: 'Validation Error',
         errors: err.issues,
      });
   }

   if (err instanceof Prisma.PrismaClientKnownRequestError) {
      // P2002: Unique Constraint (Data kembar)
      if (err.code === 'P2002') {
         const target = Array.isArray(err.meta?.target)
            ? err.meta.target.join(',')
            : String(err.meta?.target ?? '');
         return res.status(409).json({
            status: 'fail',
            msg: target.includes('link_workspaces_name_ci_key')
               ? 'A workspace with this name already exists'
               : 'Duplicate field value: Data already exists',
         });
      }
      // P2025: Record not found (jika pakai findUniqueOrThrow)
      if (err.code === 'P2025') {
         return res.status(404).json({
            status: 'fail',
            msg: 'Record not found',
         });
      }
      if (err.code === 'P2034') {
         return res.status(409).json({
            status: 'fail',
            msg: 'The operation conflicted with another update. Please retry.',
         });
      }
   }

   if (err instanceof AppError) {
      return res.status(err.statusCode).json({
         status: err.status,
         msg: err.message,
      });
   }

   console.error('ERROR 💥:', err);

   return res.status(500).json({
      status: 'error',
      msg:
         process.env.NODE_ENV === 'development' && err instanceof Error
            ? err.message
            : 'Internal Server Error',
   });
};
