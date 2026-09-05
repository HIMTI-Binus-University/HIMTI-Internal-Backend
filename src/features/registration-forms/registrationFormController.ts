import type { Request, Response } from 'express';
import { RegistrationFormBodySchema } from './registrationFormSchema.js';
import { registrationFormService as service } from './registrationFormService.js';

const eventId = (req: Request) => req.params.eventId as string;
export const getRegistrationForm = async (req: Request, res: Response) =>
   res.json({ data: await service.get(eventId(req), res.locals.user) });
export const putRegistrationForm = async (req: Request, res: Response) =>
   res.json({
      data: await service.put(
         eventId(req),
         RegistrationFormBodySchema.parse(req.body),
         res.locals.user,
      ),
   });
export const validateRegistrationForm = async (req: Request, res: Response) =>
   res.json({
      data: await service.validateCurrent(eventId(req), res.locals.user),
   });
export const previewRegistrationForm = async (req: Request, res: Response) =>
   res.json({ data: await service.preview(eventId(req), res.locals.user) });
export const publishRegistrationForm = async (req: Request, res: Response) =>
   res.json({ data: await service.publish(eventId(req), res.locals.user) });
export const closeRegistrationForm = async (req: Request, res: Response) =>
   res.json({ data: await service.close(eventId(req), res.locals.user) });
export const duplicateRegistrationForm = async (req: Request, res: Response) =>
   res
      .status(201)
      .json({ data: await service.duplicate(eventId(req), res.locals.user) });
