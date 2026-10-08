import type { Request, Response } from 'express';
import { z } from 'zod';
import {
   AttendanceCheckoutSchema,
   AttendanceVoidSchema,
   TicketCredentialSchema,
   TicketManualCheckInSchema,
   TicketSearchSchema,
} from './eventTicketSchema.js';
import { eventTicketService as service } from './eventTicketService.js';

const id = z.string().min(1);
export const listMyEventTickets = async (_req: Request, res: Response) =>
   res.json({ data: await service.list(res.locals.user.id) });
export const getMyEventTicket = async (req: Request, res: Response) =>
   res.json({
      data: await service.detail(
         id.parse(req.params.ticketId),
         res.locals.user.id,
      ),
   });
export const getMyEventTicketCredential = async (req: Request, res: Response) =>
   res.json({
      data: await service.credential(
         id.parse(req.params.ticketId),
         res.locals.user.id,
      ),
   });
export const searchEventTickets = async (req: Request, res: Response) =>
   res.json(
      await service.search(
         id.parse(req.params.eventId),
         TicketSearchSchema.parse(req.query),
         res.locals.user,
      ),
   );
export const checkInEventTicket = async (req: Request, res: Response) =>
   res.status(201).json({
      data: await service.checkIn(
         id.parse(req.params.eventId),
         TicketCredentialSchema.parse(req.body),
         res.locals.user,
      ),
   });
export const manuallyCheckInEventTicket = async (req: Request, res: Response) =>
   res.status(201).json({
      data: await service.checkIn(
         id.parse(req.params.eventId),
         TicketManualCheckInSchema.parse(req.body),
         res.locals.user,
      ),
   });
export const checkoutEventAttendance = async (req: Request, res: Response) =>
   res.json({
      data: await service.checkout(
         id.parse(req.params.eventId),
         id.parse(req.params.attendanceId),
         AttendanceCheckoutSchema.parse(req.body).expectedRevision,
         res.locals.user,
      ),
   });
export const voidEventAttendance = async (req: Request, res: Response) => {
   const body = AttendanceVoidSchema.parse(req.body);
   return res.json({
      data: await service.void(
         id.parse(req.params.eventId),
         id.parse(req.params.attendanceId),
         body.expectedRevision,
         body.reason,
         res.locals.user,
      ),
   });
};
