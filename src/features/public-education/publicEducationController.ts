import type { Request, Response, NextFunction } from 'express';
import { AppError } from '@/utils/appError.js';
import { publicSummaryParams } from './publicEducationSchema.js';
import { publicEducationService } from './publicEducationService.js';

function send(res: Response, payload: unknown) {
   const json = JSON.stringify(payload);
   if (Buffer.byteLength(json) > 4 * 1024 * 1024)
      throw new Error('Public Education response exceeds the size limit');
   res.type('json').send(json);
}

export async function getPublicCatalog(_req: Request, res: Response) {
   send(res, await publicEducationService.catalog());
}

export async function getPublicSummary(req: Request, res: Response) {
   const params = publicSummaryParams.safeParse(req.params);
   if (!params.success) throw new AppError('Invalid summary ID', 400);
   send(res, await publicEducationService.summary(params.data.id));
}

export function publicEducationError(
   error: unknown,
   _req: Request,
   res: Response,
   next: NextFunction,
) {
   if (res.headersSent) return next(error);
   if (
      error instanceof URIError ||
      (error instanceof AppError && error.statusCode === 400)
   ) {
      res.status(400).json({
         error: { code: 'BAD_REQUEST', message: 'Invalid request' },
      });
      return;
   }
   if (error instanceof AppError && error.statusCode === 404) {
      res.status(404).json({
         error: { code: 'NOT_FOUND', message: 'Not found' },
      });
      return;
   }
   console.error('Public Education API failed', error);
   res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Could not load resources' },
   });
}
