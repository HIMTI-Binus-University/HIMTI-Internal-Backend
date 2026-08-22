import type { z } from 'zod';
import type {
   attendanceListSchema,
   attendanceMutationSchema,
   scanTicketSchema,
   searchTicketSchema,
} from './eventTicketSchema.js';

export type ScanTicketRequest = z.infer<typeof scanTicketSchema>;
export type SearchTicketQuery = z.infer<typeof searchTicketSchema>;
export type AttendanceListQuery = z.infer<typeof attendanceListSchema>;
export type AttendanceMutationRequest = z.infer<
   typeof attendanceMutationSchema
>;
