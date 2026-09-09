import { z } from 'zod';

export const TicketCredentialSchema = z.object({
   credential: z.string().trim().min(1).max(64),
});
export const TicketManualCheckInSchema = z.object({
   ticketId: z.string().min(1),
});
export const TicketSearchSchema = z.object({
   search: z.string().trim().max(100).default(''),
   state: z.enum(['NOT_CHECKED_IN', 'CHECKED_IN', 'CHECKED_OUT']).optional(),
   page: z.coerce.number().int().min(1).default(1),
   limit: z.coerce.number().int().min(1).max(100).default(25),
});
export const AttendanceCheckoutSchema = z.object({
   expectedRevision: z.number().int().positive(),
});
export const AttendanceVoidSchema = z.object({
   expectedRevision: z.number().int().positive(),
   reason: z.string().trim().min(3).max(500),
});
