import type { z } from 'zod';
import type { MembershipResourcesSchema } from './membershipSchema.js';

export interface MembershipUserProfile {
   registrationCompletedAt: Date | null;
   graduateBatch: string | null;
   regionId: string | null;
}

export type MembershipResources = z.infer<typeof MembershipResourcesSchema>;
