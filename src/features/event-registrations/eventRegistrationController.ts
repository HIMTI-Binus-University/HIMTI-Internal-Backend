import type { Request, Response } from 'express';
import {
   CancelEventRegistrationSchema,
   BundleRevisionSchema,
   CreateEventBundleSchema,
   CreateEventRegistrationSchema,
   EventRegistrationListSchema,
   InternalEventRegistrationListSchema,
   JoinEventBundleSchema,
   RemoveBundleMemberSchema,
   ReplaceRegistrationAnswersSchema,
} from './eventRegistrationSchema.js';
import { eventRegistrationService as service } from './eventRegistrationService.js';
import { z } from 'zod';

export const saveSupplementalAnswers = async (req: Request, res: Response) =>
   res.json({
      data: await service.saveSupplemental(
         z.string().min(1).parse(req.params.registrationId),
         ReplaceRegistrationAnswersSchema.parse(req.body),
         res.locals.user.id,
      ),
   });

export const supplementalTracking = async (req: Request, res: Response) =>
   res.json({
      data: await service.supplementalTracking(
         z.string().min(1).parse(req.params.eventId),
         EventRegistrationListSchema.parse(req.query),
         res.locals.user,
      ),
   });

export const getRegistrationContext = async (req: Request, res: Response) =>
   res.json({ data: await service.context(req.params.eventId as string) });

export const createEventRegistration = async (req: Request, res: Response) =>
   res.status(201).json({
      data: await service.create(
         req.params.eventId as string,
         CreateEventRegistrationSchema.parse(req.body),
         res.locals.user.id,
      ),
   });

export const createEventBundle = async (req: Request, res: Response) =>
   res.status(201).json({
      data: await service.createBundle(
         req.params.eventId as string,
         CreateEventBundleSchema.parse(req.body),
         res.locals.user.id,
         z.string().uuid().parse(req.header('Idempotency-Key')),
      ),
   });

export const joinEventBundle = async (req: Request, res: Response) =>
   res.status(201).json({
      data: await service.joinBundle(
         req.params.eventId as string,
         JoinEventBundleSchema.parse(req.body),
         res.locals.user.id,
      ),
   });

export const replaceMyBundleCode = async (req: Request, res: Response) =>
   res.json({
      data: await service.replaceBundleCode(
         req.params.registrationId as string,
         BundleRevisionSchema.parse(req.body),
         res.locals.user.id,
      ),
   });

export const leaveMyBundle = async (req: Request, res: Response) =>
   res.json({
      data: await service.leave(
         req.params.registrationId as string,
         BundleRevisionSchema.parse(req.body),
         res.locals.user.id,
      ),
   });

export const listInternalBundles = async (req: Request, res: Response) =>
   res.json({
      data: await service.internalBundles(
         req.params.eventId as string,
         EventRegistrationListSchema.parse(req.query),
         res.locals.user,
      ),
   });

export const listInternalRegistrations = async (req: Request, res: Response) =>
   res.json(
      await service.internalRegistrations(
         z.string().min(1).parse(req.params.eventId),
         InternalEventRegistrationListSchema.parse(req.query),
         res.locals.user,
      ),
   );

export const getInternalRegistration = async (req: Request, res: Response) =>
   res.json({
      data: await service.internalRegistration(
         z.string().min(1).parse(req.params.eventId),
         z.string().min(1).parse(req.params.registrationId),
         res.locals.user,
      ),
   });

export const removeBundleMember = async (req: Request, res: Response) =>
   res.json({
      data: await service.removeMember(
         req.params.eventId as string,
         req.params.registrationId as string,
         req.params.userId as string,
         RemoveBundleMemberSchema.parse(req.body),
         res.locals.user,
      ),
   });

export const listMyEventRegistrations = async (req: Request, res: Response) =>
   res.json(
      await service.list(
         res.locals.user.id,
         EventRegistrationListSchema.parse(req.query),
      ),
   );

export const getMyEventRegistration = async (req: Request, res: Response) =>
   res.json({
      data: await service.get(
         req.params.registrationId as string,
         res.locals.user.id,
      ),
   });

export const replaceMyEventRegistrationAnswers = async (
   req: Request,
   res: Response,
) =>
   res.json({
      data: await service.replaceAnswers(
         req.params.registrationId as string,
         ReplaceRegistrationAnswersSchema.parse(req.body),
         res.locals.user.id,
      ),
   });

export const cancelMyEventRegistration = async (req: Request, res: Response) =>
   res.json({
      data: await service.cancel(
         req.params.registrationId as string,
         CancelEventRegistrationSchema.parse(req.body ?? {}),
         res.locals.user.id,
      ),
   });
