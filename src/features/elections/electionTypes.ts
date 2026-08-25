import { z } from 'zod';
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
