import type { RequestHandler } from 'express';
import multer from 'multer';
import { PAYMENT_PROOF_MAX_BYTES } from '@/features/events/eventService.js';
import { AppError } from '@/utils/appError.js';

const upload = multer({
   storage: multer.memoryStorage(),
   limits: { fileSize: PAYMENT_PROOF_MAX_BYTES, files: 1, fields: 1 },
}).single('file');

const uploadError = (error: unknown) => {
   if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE')
         return new AppError('Payment proof must be 1.5 MB or smaller', 413);
      if (error.code === 'LIMIT_FILE_COUNT')
         return new AppError('Upload exactly one payment proof file', 400);
      if (error.code === 'LIMIT_FIELD_COUNT')
         return new AppError('Payment proof upload contains too many fields', 400);
      if (error.code === 'LIMIT_UNEXPECTED_FILE')
         return new AppError(
            'Payment proof must be uploaded using the file field',
            400,
         );
   }
   return new AppError('Payment proof upload could not be processed', 400);
};

export const parsePaymentProof: RequestHandler = (req, res, next) => {
   upload(req, res, (error: unknown) => {
      next(error ? uploadError(error) : undefined);
   });
};
