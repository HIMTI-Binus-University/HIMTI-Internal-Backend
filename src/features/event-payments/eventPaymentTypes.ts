import type { z } from 'zod';
import type { auth } from '@/utils/auth.js';
import type {
   paymentDecisionSchema,
   paymentQueueSchema,
   paymentRejectSchema,
   paymentSettingsSchema,
} from './eventPaymentSchema.js';

export type SessionUser = typeof auth.$Infer.Session.user;
export type PaymentSettings = z.infer<typeof paymentSettingsSchema>;
export type PaymentQueue = z.infer<typeof paymentQueueSchema>;
export type PaymentDecision = z.infer<typeof paymentDecisionSchema>;
export type PaymentReject = z.infer<typeof paymentRejectSchema>;
