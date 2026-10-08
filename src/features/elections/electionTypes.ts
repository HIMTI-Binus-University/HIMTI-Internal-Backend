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
   'NOT_SOCS',
] as const;

export type ElectionEligibilityReason =
   (typeof electionEligibilityReasons)[number];

// Canonical SoCS programs from the registration reference seed, not profile free text.
export const socsStudyProgramNames = [
   'Computer Science',
   'Artificial Intelligence',
   'Computer Science - Global Class',
   'Computer Science - Regular Class',
   'Computer Science - Master Track',
   'Computer Science - Software Engineering',
   'Cyber Security',
   'Data Science',
   'Digital Psychology',
   'Game Application and Technology',
];

export const socsDepartmentNames = [
   ...socsStudyProgramNames.map((name) => name.toLowerCase()),
   'socs',
   'school of computer science',
   'computer science',
   'cybersecurity',
   'ai',
   'game application & technology',
   'game application technology',
   'gat',
   'software engineering',
];
export const departmentPrefix =
   '^(department of |study program of |program of |department |study program |program )';
export const departmentSuffix = '( department| study program| program)$';
export const normalizeDepartment = (value: string) =>
   value
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ')
      .replace(new RegExp(departmentPrefix), '')
      .replace(new RegExp(departmentSuffix), '')
      .trim();

type EligibilityUser = {
   status: UserStatus;
   registrationCompletedAt: Date | null;
   outlookEmail: string | null;
   outlookEmailVerified: boolean;
   studyProgram: { name: string } | null;
   memberType: 'STUDENT' | 'LECTURER' | 'OTHER' | null;
   institutionType: 'BINUS' | 'NON_BINUS' | null;
   department: string | null;
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
   if (
      parts.length !== 2 ||
      !parts[0] ||
      !['binus.ac.id', 'binus.edu'].includes(parts[1])
   )
      return 'OUTLOOK_DOMAIN_NOT_ALLOWED';
   if (user.institutionType !== 'BINUS') return 'NOT_SOCS';
   if (user.memberType === 'LECTURER')
      return user.department &&
         socsDepartmentNames.includes(normalizeDepartment(user.department))
         ? null
         : 'NOT_SOCS';
   return user.memberType === 'STUDENT' &&
      user.studyProgram &&
      socsStudyProgramNames.includes(user.studyProgram.name)
      ? null
      : 'NOT_SOCS';
};
