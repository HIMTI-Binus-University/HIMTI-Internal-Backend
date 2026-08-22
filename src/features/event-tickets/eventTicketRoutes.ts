import express from 'express';
import { requireAuth } from '@/middleware/authMiddleware.js';
import { requirePermission } from '@/middleware/permissionMiddleware.js';
import {
   checkInCredential,
   checkInManual,
   checkoutAttendance,
   getMyCredential,
   getMyQr,
   getMyTicket,
   listAttendance,
   listMyTickets,
   scanTicket,
   searchTickets,
   voidAttendance,
} from './eventTicketController.js';

const router = express.Router();
router.get('/me/event-tickets', requireAuth, listMyTickets);
router.get('/me/event-tickets/:ticketId', requireAuth, getMyTicket);
router.get(
   '/me/event-tickets/:ticketId/credential',
   requireAuth,
   getMyCredential,
);
router.post(
   '/internal/sub-events/:subEventId/tickets/check-in',
   requireAuth,
   requirePermission('scan_event_tickets'),
   checkInCredential,
);
router.post(
   '/internal/sub-events/:subEventId/tickets/manual-check-in',
   requireAuth,
   requirePermission('scan_event_tickets'),
   checkInManual,
);
router.get('/me/event-tickets/:ticketId/qr.png', requireAuth, getMyQr);
router.post(
   '/internal/sub-events/:subEventId/tickets/resolve',
   requireAuth,
   requirePermission('scan_event_tickets'),
   scanTicket,
);
router.get(
   '/internal/sub-events/:subEventId/tickets/search',
   requireAuth,
   requirePermission('scan_event_tickets'),
   searchTickets,
);
router.get(
   '/internal/sub-events/:subEventId/attendance',
   requireAuth,
   requirePermission('view_event_attendance'),
   listAttendance,
);
router.post(
   '/internal/sub-events/:subEventId/attendance/:attendanceId/checkout',
   requireAuth,
   requirePermission('correct_event_attendance'),
   checkoutAttendance,
);
router.post(
   '/internal/sub-events/:subEventId/attendance/:attendanceId/void',
   requireAuth,
   requirePermission('correct_event_attendance'),
   voidAttendance,
);
export default router;
