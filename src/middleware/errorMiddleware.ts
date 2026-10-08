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
   const failure = (
      status: 'fail' | 'error',
      code: string,
      message: string,
      details?: unknown,
      errors?: unknown,
   ) => ({
      status,
      code,
      message,
      msg: message,
      ...(details !== undefined && { details }),
      ...(errors !== undefined && { errors }),
   });

   if (err instanceof ZodError) {
      return res
         .status(400)
         .json(
            failure(
               'fail',
               'VALIDATION_ERROR',
               'Validation Error',
               { issues: err.issues },
               err.issues,
            ),
         );
   }

   if (err instanceof Prisma.PrismaClientKnownRequestError) {
      // P2002: Unique Constraint (Data kembar)
      if (err.code === 'P2002') {
         const target = Array.isArray(err.meta?.target)
            ? err.meta.target.join(',')
            : String(err.meta?.target ?? '');
         const message = target.includes('link_workspaces_name_ci_key')
            ? 'A workspace with this name already exists'
            : 'Duplicate field value: Data already exists';
         return res
            .status(409)
            .json(failure('fail', 'DUPLICATE_RESOURCE', message));
      }
      // P2025: Record not found (jika pakai findUniqueOrThrow)
      if (err.code === 'P2025') {
         return res
            .status(404)
            .json(failure('fail', 'RESOURCE_NOT_FOUND', 'Record not found'));
      }
      if (err.code === 'P2034') {
         return res
            .status(409)
            .json(
               failure(
                  'fail',
                  'TRANSACTION_CONFLICT',
                  'The operation conflicted with another update. Please retry.',
               ),
            );
      }
   }

   if (err instanceof AppError) {
      return res
         .status(err.statusCode)
         .json(
            failure(
               err.status as 'fail' | 'error',
               err.code,
               err.message,
               err.details,
            ),
         );
   }

   console.error('ERROR 💥:', err);

   const message =
      process.env.NODE_ENV === 'development' && err instanceof Error
         ? err.message
         : 'Internal Server Error';
   return res
      .status(500)
      .json(failure('error', 'INTERNAL_SERVER_ERROR', message));
};
