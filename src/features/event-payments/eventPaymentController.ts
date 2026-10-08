import type { Request, Response } from 'express';
import { pipeline } from 'node:stream/promises';
import { z } from 'zod';
import { eventPaymentService as service } from './eventPaymentService.js';
import {
   PaymentIdSchema,
   PaymentQueueSchema,
   PaymentRevisionSchema,
   PaymentCorrectionSchema,
   PaymentRejectSchema,
} from './eventPaymentSchema.js';

export const participantPayment = async (req: Request, res: Response) => {
   res.json({
      msg: 'success',
      data: await service.participant(
         PaymentIdSchema.parse(req.params.registrationId),
         res.locals.user,
      ),
   });
};
export const paymentQueue = async (req: Request, res: Response) => {
   res.json({
      msg: 'success',
      ...(await service.queue(
         PaymentIdSchema.parse(req.params.eventId),
         PaymentQueueSchema.parse(req.query),
         res.locals.user,
      )),
   });
};
export const internalPayment = async (req: Request, res: Response) => {
   res.json({
      msg: 'success',
      data: await service.internal(
         PaymentIdSchema.parse(req.params.paymentId),
         res.locals.user,
      ),
   });
};
export const internalRegistrationPayment = async (
   req: Request,
   res: Response,
) => {
   res.json({
      msg: 'success',
      data: await service.internalForRegistration(
         PaymentIdSchema.parse(req.params.eventId),
         PaymentIdSchema.parse(req.params.registrationId),
         res.locals.user,
      ),
   });
};
export const reviewPayment =
   (action: 'approve' | 'request-correction' | 'reject') =>
   async (req: Request, res: Response) => {
      const schema =
         action === 'request-correction'
            ? PaymentCorrectionSchema
            : action === 'reject'
              ? PaymentRejectSchema
              : PaymentRevisionSchema;
      res.json({
         msg: 'success',
         data: await service.review(
            PaymentIdSchema.parse(req.params.paymentId),
            action,
            schema.parse(req.body),
            res.locals.user,
         ),
      });
   };
export const uploadAcknowledgement = async (req: Request, res: Response) => {
   const key = z
      .string()
      .trim()
      .min(8)
      .max(200)
      .parse(req.get('Idempotency-Key'));
   res.json({
      msg: 'success',
      data: await service.upload(
         PaymentIdSchema.parse(req.params.paymentId),
         PaymentRevisionSchema.parse(req.body),
         req.file,
         key,
         res.locals.user,
      ),
   });
};
export const proofContent = async (req: Request, res: Response) => {
   const content = await service.content(
      PaymentIdSchema.parse(req.params.proofId),
      res.locals.user,
   );
   res.set({
      'Content-Type': content.mediaType,
      'Content-Disposition': 'inline; filename="payment-proof"',
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "sandbox; default-src 'none'",
      'Cross-Origin-Resource-Policy': 'same-site',
   });
   await pipeline(content.stream, res);
};
