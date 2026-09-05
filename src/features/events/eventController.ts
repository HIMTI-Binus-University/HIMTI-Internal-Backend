import type { Request, Response } from 'express';
import { eventService } from './eventService.js';
import {
   CreateEventSchema,
   EventListSchema,
   OrganizerSchema,
   OrganizerUpdateSchema,
   RegistrationSettingsSchema,
   UpdateEventSchema,
} from './eventSchema.js';

export const listPublicEvents = async (req: Request, res: Response) =>
   res.json({
      data: await eventService.listPublic(EventListSchema.parse(req.query)),
   });
export const getPublicEvent = async (req: Request, res: Response) =>
   res.json({
      data: await eventService.getPublic(req.params.eventId as string),
   });
export const listInternalEvents = async (req: Request, res: Response) =>
   res.json({
      data: await eventService.listInternal(
         EventListSchema.parse(req.query),
         res.locals.user,
      ),
   });
export const getInternalEvent = async (req: Request, res: Response) =>
   res.json({
      data: await eventService.assertScope(
         req.params.eventId as string,
         res.locals.user,
      ),
   });
export const createEvent = async (req: Request, res: Response) =>
   res.status(201).json({
      data: await eventService.create(
         CreateEventSchema.parse(req.body),
         res.locals.user,
      ),
   });
export const updateEvent = async (req: Request, res: Response) =>
   res.json({
      data: await eventService.update(
         req.params.eventId as string,
         UpdateEventSchema.parse(req.body),
         res.locals.user,
      ),
   });
export const transitionEvent =
   (status: 'PUBLISHED' | 'CLOSED' | 'CANCELLED') =>
   async (req: Request, res: Response) =>
      res.json({
         data: await eventService.transition(
            req.params.eventId as string,
            status,
            res.locals.user,
         ),
      });
export const listOrganizers = async (req: Request, res: Response) =>
   res.json({
      data: await eventService.organizers(
         req.params.eventId as string,
         res.locals.user,
      ),
   });
export const addOrganizer = async (req: Request, res: Response) => {
   const body = OrganizerSchema.parse(req.body);
   res.status(201).json({
      data: await eventService.addOrganizer(
         req.params.eventId as string,
         body.userId,
         body.role,
         res.locals.user,
      ),
   });
};
export const updateOrganizer = async (req: Request, res: Response) => {
   const body = OrganizerUpdateSchema.parse(req.body);
   res.json({
      data: await eventService.updateOrganizer(
         req.params.eventId as string,
         req.params.userId as string,
         body.role,
         res.locals.user,
      ),
   });
};
export const removeOrganizer = async (req: Request, res: Response) =>
   res.json({
      data: await eventService.removeOrganizer(
         req.params.eventId as string,
         req.params.userId as string,
         res.locals.user,
      ),
   });

export const getRegistrationSettings = async (req: Request, res: Response) =>
   res.json({
      data: await eventService.getRegistrationSettings(
         req.params.eventId as string,
         res.locals.user,
      ),
   });

export const updateRegistrationSettings = async (req: Request, res: Response) =>
   res.json({
      data: await eventService.updateRegistrationSettings(
         req.params.eventId as string,
         RegistrationSettingsSchema.parse(req.body),
         res.locals.user,
      ),
   });
