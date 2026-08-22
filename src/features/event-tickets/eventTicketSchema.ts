import { z } from 'zod';

export const ticketIdParamSchema = z.object({ ticketId: z.string().min(1) });
export const subEventParamSchema = z.object({ subEventId: z.string().min(1) });
export const attendanceParamSchema = z.object({
   attendanceId: z.string().min(1),
});
export const scanTicketSchema = z.object({
   credential: z.string().min(32).max(512),
});
export const manualCheckInSchema = z.object({ ticketId: z.string().min(1) });
export const searchTicketSchema = z.object({
   search: z.string().trim().min(2).max(100),
   page: z.coerce.number().int().min(1).default(1),
   limit: z.coerce.number().int().min(1).max(50).default(20),
});
export const attendanceListSchema = z.object({
   page: z.coerce.number().int().min(1).default(1),
   limit: z.coerce.number().int().min(1).max(100).default(25),
   search: z.string().trim().max(100).optional(),
});
export const attendanceMutationSchema = z.object({
   revision: z.number().int().positive(),
   reason: z.string().trim().min(3).max(1000),
});
