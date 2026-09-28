import { z } from 'zod';
import type { UserStatus } from '@prisma/client';
import {
   CastVoteSchema,
   CreateCandidateSchema,
   CreateElectionSchema,
   UpdateCandidateSchema,
   UpdateDebateScheduleSchema,
   UpdateElectionSchema,
   UpdateElectionPublicDetailsSchema,
   UpdateVotingEndSchema,
} from './electionSchema.js';

export type CreateElectionRequest = z.infer<typeof CreateElectionSchema>;
export type UpdateElectionRequest = z.infer<typeof UpdateElectionSchema>;
export type UpdateElectionPublicDetailsRequest = z.infer<
   typeof UpdateElectionPublicDetailsSchema
>;
export type UpdateDebateScheduleRequest = z.infer<
   typeof UpdateDebateScheduleSchema
>;
export type UpdateVotingEndRequest = z.infer<typeof UpdateVotingEndSchema>;
export type CreateCandidateRequest = z.infer<typeof CreateCandidateSchema>;
export type UpdateCandidateRequest = z.infer<typeof UpdateCandidateSchema>;
export type CastVoteRequest = z.infer<typeof CastVoteSchema>;

export const electionEligibilityReasons = [
   'ACCOUNT_INACTIVE',
   'PROFILE_INCOMPLETE',
   'OUTLOOK_NOT_VERIFIED',
   'OUTLOOK_DOMAIN_NOT_ALLOWED',
] as const;

export type ElectionEligibilityReason =
   (typeof electionEligibilityReasons)[number];

type EligibilityUser = {
   status: UserStatus;
   registrationCompletedAt: Date | null;
   outlookEmail: string | null;
   outlookEmailVerified: boolean;
};

export const getElectionEligibilityReason = (
   user: EligibilityUser,
): ElectionEligibilityReason | null => {
   if (user.status !== 'ACTIVE') return 'ACCOUNT_INACTIVE';
   if (!user.registrationCompletedAt) return 'PROFILE_INCOMPLETE';
   if (!user.outlookEmailVerified || !user.outlookEmail) {
      return 'OUTLOOK_NOT_VERIFIED';
   }

   const email = user.outlookEmail.trim().toLowerCase();
   const parts = email.split('@');
   return parts.length === 2 &&
      parts[0] &&
      ['binus.ac.id', 'binus.edu'].includes(parts[1])
      ? null
      : 'OUTLOOK_DOMAIN_NOT_ALLOWED';
};
