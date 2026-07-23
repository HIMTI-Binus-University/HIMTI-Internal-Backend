import type { z } from 'zod';
import type {
   CreatePeriodSchema,
   CreateResourceSchema,
   MembershipPositionSchema,
   MembershipResourcesSchema,
   MembershipStatusSchema,
   UpdateResourceSchema,
} from './membershipSchema.js';

export type MembershipResources = z.infer<typeof MembershipResourcesSchema>;
export type MembershipPosition = z.infer<typeof MembershipPositionSchema>;
export type MembershipStatus = z.infer<typeof MembershipStatusSchema>;
export type CreatePeriodRequest = z.infer<typeof CreatePeriodSchema>;
export type CreateResourceRequest = z.infer<typeof CreateResourceSchema>;
export type UpdateResourceRequest = z.infer<typeof UpdateResourceSchema>;
