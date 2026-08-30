import { randomBytes } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { AppError } from '@/utils/appError.js';
import { electionRepository } from './electionRepository.js';
import { getElectionEligibilityReason } from './electionTypes.js';
import type {
   CastVoteRequest,
   CreateCandidateRequest,
   CreateElectionRequest,
   UpdateCandidateRequest,
   UpdateDebateScheduleRequest,
   UpdateElectionRequest,
   UpdateElectionPublicDetailsRequest,
} from './electionTypes.js';

const publicElection = <T extends { candidates: { isActive: boolean }[] }>(
   election: T,
) => ({
   ...election,
   candidates: election.candidates.filter((candidate) => candidate.isActive),
});

class ElectionService {
   async getCurrent() {
      const election = await electionRepository.findCurrent();
      return election ? publicElection(election) : null;
   }

   async getCandidates(electionId: string) {
      const election = await electionRepository.findById(electionId);
      if (!election) throw new AppError('Election not found', 404);
      if (election.status === 'DRAFT') {
         throw new AppError('Election not found', 404);
      }
      return publicElection(election).candidates;
   }

   async getEligibility(electionId: string, userId: string) {
      const [election, user, participation] = await Promise.all([
         electionRepository.findById(electionId),
         electionRepository.findEligibilityUser(userId),
         electionRepository.findParticipation(electionId, userId),
      ]);
      if (!election) throw new AppError('Election not found', 404);
      if (!user) throw new AppError('User not found', 404);

      if (participation) {
         return { eligible: false, reason: 'ALREADY_VOTED', hasVoted: true };
      }

      const reason = getElectionEligibilityReason(user);
      if (reason) return { eligible: false, reason, hasVoted: false };

      const now = new Date();
      if (
         election.status !== 'OPEN' ||
         now < election.startsAt ||
         now >= election.endsAt
      ) {
         return {
            eligible: false,
            reason: 'ELECTION_NOT_OPEN',
            hasVoted: false,
         };
      }

      return { eligible: true, reason: null, hasVoted: false };
   }

   async getVoteStatus(electionId: string, userId: string) {
      const election = await electionRepository.findById(electionId);
      if (!election) throw new AppError('Election not found', 404);
      const participation = await electionRepository.findParticipation(
         electionId,
         userId,
      );
      return participation
         ? { hasVoted: true, ...participation }
         : { hasVoted: false, receiptCode: null, votedAt: null };
   }

   async castVote(
      electionId: string,
      payload: CastVoteRequest,
      userId: string,
   ) {
      const receiptCode = `EL-${randomBytes(12).toString('hex').toUpperCase()}`;
      try {
         return await electionRepository.castVote(
            electionId,
            payload.candidateId,
            userId,
            receiptCode,
         );
      } catch (error) {
         if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === 'P2002'
         ) {
            throw new AppError('Vote already recorded', 409, 'ALREADY_VOTED');
         }
         throw error;
      }
   }

   async getPublishedResults(electionId: string) {
      const tally = await electionRepository.tally(electionId);
      if (tally.status !== 'PUBLISHED') {
         throw new AppError(
            'Election results are not published',
            404,
            'RESULTS_NOT_PUBLISHED',
         );
      }
      return this.formatResults(tally);
   }

   async list() {
      return electionRepository.list();
   }

   async get(electionId: string) {
      const election = await electionRepository.findById(electionId);
      if (!election) throw new AppError('Election not found', 404);
      return election;
   }

   async create(payload: CreateElectionRequest, userId: string) {
      return electionRepository.create(payload, userId);
   }

   async update(
      electionId: string,
      payload: UpdateElectionRequest,
      userId: string,
   ) {
      const election = await this.get(electionId);
      if (election.status !== 'DRAFT') {
         throw new AppError(
            'Only draft elections can be edited',
            409,
            'INVALID_ELECTION_STATE',
         );
      }
      const startsAt = payload.startsAt
         ? new Date(payload.startsAt)
         : election.startsAt;
      const endsAt = payload.endsAt
         ? new Date(payload.endsAt)
         : election.endsAt;
      if (startsAt >= endsAt) {
         throw new AppError('endsAt must be after startsAt', 400);
      }
      return electionRepository.update(electionId, payload, userId);
   }

   async updateDebateSchedule(
      electionId: string,
      payload: UpdateDebateScheduleRequest,
      userId: string,
   ) {
      const election = await this.get(electionId);
      assertDebateScheduleEditable(election.status);
      return electionRepository.update(electionId, payload, userId, [
         'DRAFT',
         'OPEN',
      ]);
   }

   async updatePublicDetails(
      electionId: string,
      payload: UpdateElectionPublicDetailsRequest,
      userId: string,
   ) {
      const election = await this.get(electionId);
      assertPublicDetailsEditable(election.status);
      return electionRepository.update(electionId, payload, userId, [
         'DRAFT',
         'OPEN',
      ]);
   }

   async createCandidate(electionId: string, payload: CreateCandidateRequest) {
      return electionRepository.createCandidate(electionId, payload);
   }

   async updateCandidate(candidateId: string, payload: UpdateCandidateRequest) {
      return electionRepository.updateCandidate(candidateId, payload);
   }

   async open(electionId: string, userId: string) {
      return electionRepository.transition(electionId, 'DRAFT', 'OPEN', userId);
   }

   async close(electionId: string, userId: string) {
      return electionRepository.transition(
         electionId,
         'OPEN',
         'CLOSED',
         userId,
      );
   }

   async getTurnout(electionId: string) {
      const tally = await electionRepository.tally(electionId);
      return {
         participationCount: tally.participationCount,
         ballotCount: tally.ballotCount,
         valid: tally.participationCount === tally.ballotCount,
      };
   }

   async getTally(electionId: string) {
      const tally = await electionRepository.tally(electionId);
      if (!['CLOSED', 'PUBLISHED'].includes(tally.status)) {
         throw new AppError(
            'Tally is available only after the election closes',
            409,
            'ELECTION_NOT_CLOSED',
         );
      }
      return this.formatResults(tally);
   }

   async publish(electionId: string, userId: string) {
      const tally = await electionRepository.tally(electionId);
      if (tally.status !== 'CLOSED') {
         throw new AppError(
            'Election must be closed',
            409,
            'INVALID_ELECTION_STATE',
         );
      }
      if (!tally.valid) {
         throw new AppError(
            'Election tally failed integrity checks',
            409,
            'INVALID_TALLY',
         );
      }
      return electionRepository.transition(
         electionId,
         'CLOSED',
         'PUBLISHED',
         userId,
      );
   }

   private formatResults(
      tally: Awaited<ReturnType<typeof electionRepository.tally>>,
   ) {
      const maximum = Math.max(0, ...tally.results.map((item) => item.votes));
      const winners = tally.results
         .filter((item) => item.votes === maximum && maximum > 0)
         .map((item) => item.candidate.id);
      return {
         participationCount: tally.participationCount,
         ballotCount: tally.ballotCount,
         valid: tally.valid,
         winnerCandidateId: winners.length === 1 ? winners[0] : null,
         isTie: winners.length > 1,
         results: tally.results,
      };
   }
}

export const electionService = new ElectionService();

export const assertDebateScheduleEditable = (status: string) => {
   if (!['DRAFT', 'OPEN'].includes(status)) {
      throw new AppError(
         'Debate schedule can be edited only in draft or open elections',
         409,
         'INVALID_ELECTION_STATE',
      );
   }
};

export const assertPublicDetailsEditable = (status: string) => {
   if (!['DRAFT', 'OPEN'].includes(status)) {
      throw new AppError(
         'Public details can be edited only in draft or open elections',
         409,
         'INVALID_ELECTION_STATE',
      );
   }
};
