import type { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import { AppError } from '@/utils/appError.js';
import { eventPaymentService } from './eventPaymentService.js';
import {
   idParamSchema,
   paymentDecisionSchema,
   paymentQueueSchema,
   paymentRejectSchema,
   paymentSettingsSchema,
   registrationParamSchema,
   subEventParamSchema,
} from './eventPaymentSchema.js';

export const getPaymentSettings = async (req: Request, res: Response) => {
   const { subEventId } = subEventParamSchema.parse(req.params);
   res.json({
      msg: 'success',
      data: await eventPaymentService.getSettings(subEventId, res.locals.user),
   });
};
export const updatePaymentSettings = async (req: Request, res: Response) => {
   const { subEventId } = subEventParamSchema.parse(req.params);
   const body = paymentSettingsSchema.parse(req.body);
   res.json({
      msg: 'success',
      data: await eventPaymentService.updateSettings(
         subEventId,
         res.locals.user,
         body,
      ),
   });
};
export const listPayments = async (req: Request, res: Response) => {
   const { subEventId } = subEventParamSchema.parse(req.params);
   const query = paymentQueueSchema.parse(req.query);
   res.json({
      msg: 'success',
      ...(await eventPaymentService.list(subEventId, res.locals.user, query)),
   });
};
export const getPaymentDetail = async (req: Request, res: Response) => {
   const { id } = idParamSchema.parse(req.params);
   res.json({
      msg: 'success',
      data: await eventPaymentService.getDetail(id, res.locals.user),
   });
};
export const getMyPayment = async (req: Request, res: Response) => {
   const { registrationId } = registrationParamSchema.parse(req.params);
   res.json({
      msg: 'success',
      data: await eventPaymentService.getMine(registrationId, res.locals.user),
   });
};

export const handlePaymentProofUploadError = (
   error: unknown,
   _req: Request,
   _res: Response,
   next: NextFunction,
) => {
   if (!(error instanceof multer.MulterError)) return next(error);
   if (error.code === 'LIMIT_FILE_SIZE')
      return next(
         new AppError('Payment proof exceeds 10 MiB', 413, 'PROOF_TOO_LARGE'),
      );
   return next(
      new AppError(
         'Invalid payment proof multipart request',
         400,
         'PROOF_MULTIPART_INVALID',
      ),
   );
};
export const uploadPaymentProof = async (req: Request, res: Response) => {
   const { id } = idParamSchema.parse(req.params);
   res.status(201).json({
      msg: 'success',
      data: await eventPaymentService.uploadProof(
         id,
         res.locals.user,
         req.file,
      ),
   });
};
export const verifyPayment = async (req: Request, res: Response) => {
   const { id } = idParamSchema.parse(req.params);
   res.json({
      msg: 'success',
      data: await eventPaymentService.review(
         id,
         res.locals.user,
         'VERIFIED',
         paymentDecisionSchema.parse(req.body),
      ),
   });
};
export const rejectPayment = async (req: Request, res: Response) => {
   const { id } = idParamSchema.parse(req.params);
   res.json({
      msg: 'success',
      data: await eventPaymentService.review(
         id,
         res.locals.user,
         'REJECTED',
         paymentRejectSchema.parse(req.body),
      ),
   });
};
export const streamProof = async (req: Request, res: Response) => {
   const { id } = idParamSchema.parse(req.params);
   const result = await eventPaymentService.content(id, res.locals.user);
   const safeName = result.filename.replace(/[\r\n"\\]/g, '_');
   res.setHeader('X-Content-Type-Options', 'nosniff');
   res.setHeader('Content-Type', result.mediaType);
   res.setHeader(
      'Content-Disposition',
      `${result.mediaType === 'application/pdf' ? 'inline' : 'attachment'}; filename="${safeName}"`,
   );
   result.stream.pipe(res);
};
