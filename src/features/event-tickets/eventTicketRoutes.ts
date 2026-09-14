import express from 'express';
import { requireAuth } from '@/middleware/authMiddleware.js';
import { requirePermission } from '@/middleware/permissionMiddleware.js';
import {
   checkInEventTicket,
   checkoutEventAttendance,
   getMyEventTicket,
   getMyEventTicketCredential,
   listMyEventTickets,
   manuallyCheckInEventTicket,
   searchEventTickets,
   voidEventAttendance,
} from './eventTicketController.js';

const router = express.Router();
router.get('/me/event-tickets', requireAuth, listMyEventTickets);
router.get('/me/event-tickets/:ticketId', requireAuth, getMyEventTicket);
router.get(
   '/me/event-tickets/:ticketId/credential',
   requireAuth,
   getMyEventTicketCredential,
);
router.get(
   '/internal/events/:eventId/tickets/search',
   requireAuth,
   requirePermission('view_event_attendance'),
   searchEventTickets,
);
router.get(
   '/internal/events/:eventId/attendance',
   requireAuth,
   requirePermission('view_event_attendance'),
   searchEventTickets,
);
router.post(
   '/internal/events/:eventId/tickets/check-in',
   requireAuth,
   requirePermission('scan_event_tickets'),
   checkInEventTicket,
);
router.post(
   '/internal/events/:eventId/tickets/manual-check-in',
   requireAuth,
   requirePermission('scan_event_tickets'),
   manuallyCheckInEventTicket,
);
router.post(
   '/internal/events/:eventId/attendance/:attendanceId/checkout',
   requireAuth,
   requirePermission('correct_event_attendance'),
   checkoutEventAttendance,
);
router.post(
   '/internal/events/:eventId/attendance/:attendanceId/void',
   requireAuth,
   requirePermission('correct_event_attendance'),
   voidEventAttendance,
);
export default router;
