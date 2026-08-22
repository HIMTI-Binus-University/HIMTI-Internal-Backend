import type { Request, Response } from 'express';
import { eventTicketService } from './eventTicketService.js';
import {
   attendanceListSchema,
   attendanceMutationSchema,
   manualCheckInSchema,
   scanTicketSchema,
   searchTicketSchema,
} from './eventTicketSchema.js';

export const listMyTickets = async (_req: Request, res: Response) =>
   res.json({
      msg: 'success',
      data: await eventTicketService.listOwned(res.locals.user.id),
   });
export const getMyTicket = async (req: Request, res: Response) =>
   res.json({
      msg: 'success',
      data: await eventTicketService.detail(
         req.params.ticketId as string,
         res.locals.user.id,
      ),
   });
export const getMyCredential = async (req: Request, res: Response) =>
   res.json({
      msg: 'success',
      data: {
         credential: await eventTicketService.credential(
            req.params.ticketId as string,
            res.locals.user.id,
         ),
      },
   });
export const getMyQr = async (req: Request, res: Response) => {
   const png = await eventTicketService.qr(
      req.params.ticketId as string,
      res.locals.user.id,
   );
   res.type('png').set('Cache-Control', 'private, no-store').send(png);
};
export const checkInCredential = async (req: Request, res: Response) => {
   const body = scanTicketSchema.parse(req.body);
   res.json({
      msg: 'success',
      data: await eventTicketService.checkInCredential(
         req.params.subEventId as string,
         body.credential,
         res.locals.user,
      ),
   });
};
export const checkInManual = async (req: Request, res: Response) => {
   const body = manualCheckInSchema.parse(req.body);
   res.json({
      msg: 'success',
      data: await eventTicketService.checkInManual(
         req.params.subEventId as string,
         body.ticketId,
         res.locals.user,
      ),
   });
};
export const scanTicket = async (req: Request, res: Response) => {
   const body = scanTicketSchema.parse(req.body);
   res.json({
      msg: 'success',
      data: await eventTicketService.resolve(
         req.params.subEventId as string,
         body.credential,
         res.locals.user,
      ),
   });
};
export const searchTickets = async (req: Request, res: Response) =>
   res.json({
      msg: 'success',
      ...(await eventTicketService.search(
         req.params.subEventId as string,
         searchTicketSchema.parse(req.query),
         res.locals.user,
      )),
   });
export const listAttendance = async (req: Request, res: Response) =>
   res.json({
      msg: 'success',
      ...(await eventTicketService.attendance(
         req.params.subEventId as string,
         attendanceListSchema.parse(req.query),
         res.locals.user,
      )),
   });
const mutation =
   (action: 'CHECK_OUT' | 'VOID') => async (req: Request, res: Response) =>
      res.json({
         msg: 'success',
         data: await eventTicketService.mutate(
            req.params.subEventId as string,
            req.params.attendanceId as string,
            res.locals.user,
            attendanceMutationSchema.parse(req.body),
            action,
         ),
      });
export const checkoutAttendance = mutation('CHECK_OUT');
export const voidAttendance = mutation('VOID');
