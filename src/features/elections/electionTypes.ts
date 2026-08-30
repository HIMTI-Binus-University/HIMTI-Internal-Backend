import { z } from 'zod';
import type { MemberType, UserStatus } from '@prisma/client';
import {
   CastVoteSchema,
   CreateCandidateSchema,
   CreateElectionSchema,
   UpdateCandidateSchema,
   UpdateDebateScheduleSchema,
   UpdateElectionSchema,
   UpdateElectionPublicDetailsSchema,
} from './electionSchema.js';

export type CreateElectionRequest = z.infer<typeof CreateElectionSchema>;
export type UpdateElectionRequest = z.infer<typeof UpdateElectionSchema>;
export type UpdateElectionPublicDetailsRequest = z.infer<
   typeof UpdateElectionPublicDetailsSchema
>;
export type UpdateDebateScheduleRequest = z.infer<
   typeof UpdateDebateScheduleSchema
>;
export type CreateCandidateRequest = z.infer<typeof CreateCandidateSchema>;
export type UpdateCandidateRequest = z.infer<typeof UpdateCandidateSchema>;
export type CastVoteRequest = z.infer<typeof CastVoteSchema>;

export const electionEligibilityReasons = [
   'ACCOUNT_INACTIVE',
   'PROFILE_INCOMPLETE',
   'OUTLOOK_NOT_VERIFIED',
   'OUTLOOK_DOMAIN_NOT_ALLOWED',
   'NOT_COMPUTER_SCIENCE',
] as const;

export type ElectionEligibilityReason =
   (typeof electionEligibilityReasons)[number];

type EligibilityUser = {
   status: UserStatus;
   registrationCompletedAt: Date | null;
   outlookEmail: string | null;
   outlookEmailVerified: boolean;
   memberType: MemberType | null;
   studyProgramName: string | null;
   department: string | null;
   studyProgram: { name: string } | null;
};

const normalize = (value: string) =>
   value.trim().replace(/\s+/g, ' ').toLowerCase();

const studentProgramPhrases = [
   'computer science',
   'data science',
   'game application and technology',
];

export const getElectionEligibilityReason = (
   user: EligibilityUser,
): ElectionEligibilityReason | null => {
   if (user.status !== 'ACTIVE') return 'ACCOUNT_INACTIVE';
   if (!user.registrationCompletedAt) return 'PROFILE_INCOMPLETE';
   if (!user.outlookEmailVerified || !user.outlookEmail) {
      return 'OUTLOOK_NOT_VERIFIED';
   }

   const domain = user.outlookEmail.trim().toLowerCase().split('@').at(1);

   if (user.memberType === 'STUDENT') {
      if (domain !== 'binus.ac.id') return 'OUTLOOK_DOMAIN_NOT_ALLOWED';
      const program = normalize(
         user.studyProgram?.name ?? user.studyProgramName ?? '',
      );
      return studentProgramPhrases.some((phrase) => program.includes(phrase))
         ? null
         : 'NOT_COMPUTER_SCIENCE';
   }

   if (user.memberType === 'LECTURER') {
      if (domain !== 'binus.edu') return 'OUTLOOK_DOMAIN_NOT_ALLOWED';
      return normalize(user.department ?? '') === 'school of computer science'
         ? null
         : 'NOT_COMPUTER_SCIENCE';
   }

   return 'NOT_COMPUTER_SCIENCE';
};
