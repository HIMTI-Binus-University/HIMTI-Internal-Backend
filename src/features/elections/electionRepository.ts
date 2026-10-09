import { Prisma } from '@prisma/client';
import { prisma } from '@/config/prisma.js';
import { AppError } from '@/utils/appError.js';
import {
   getElectionEligibilityReason,
   socsStudyProgramNames,
   socsDepartmentNames,
   departmentPrefix,
   departmentSuffix,
} from './electionTypes.js';
import type {
   CreateCandidateRequest,
   CreateElectionRequest,
   UpdateCandidateRequest,
   UpdateElectionRequest,
} from './electionTypes.js';

const candidateSelect = {
   id: true,
   electionId: true,
   ballotNumber: true,
   name: true,
   photoUrl: true,
   biography: true,
   slogan: true,
   vision: true,
   mission: true,
   videoUrl: true,
   workPrograms: true,
   experiences: true,
   isActive: true,
} satisfies Prisma.ElectionCandidateSelect;

const electionSelect = {
   id: true,
   slug: true,
   title: true,
   description: true,
   status: true,
   startsAt: true,
   endsAt: true,
   originalEndsAt: true,
   debateAt: true,
   secondDebateAt: true,
   openedAt: true,
   closedAt: true,
   publishedAt: true,
   createdAt: true,
   updatedAt: true,
   candidates: {
      select: candidateSelect,
      orderBy: { ballotNumber: 'asc' as const },
   },
} satisfies Prisma.ElectionSelect;

const eligibilityUserSelect = {
   status: true,
   registrationCompletedAt: true,
   outlookEmail: true,
   outlookEmailVerified: true,
   studyProgram: { select: { name: true } },
   memberType: true,
   institutionType: true,
   department: true,
} satisfies Prisma.UserSelect;

export const assertCandidateEditable = (status: string) => {
   if (status !== 'DRAFT' && status !== 'OPEN')
      throw new AppError(
         'Candidates can be edited only in draft or open elections',
         409,
         'INVALID_ELECTION_STATE',
      );
};

class ElectionRepository {
   async findCurrent() {
      return (
         (await prisma.election.findFirst({
            where: { status: 'OPEN' },
            select: electionSelect,
            orderBy: { openedAt: 'desc' },
         })) ??
         (await prisma.election.findFirst({
            where: { status: 'CLOSED' },
            select: electionSelect,
            orderBy: [{ closedAt: 'desc' }, { createdAt: 'desc' }],
         })) ??
         prisma.election.findFirst({
            where: { status: 'PUBLISHED' },
            select: electionSelect,
            orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
         })
      );
   }

   async findById(id: string) {
      return prisma.election.findUnique({
         where: { id },
         select: electionSelect,
      });
   }

   async list() {
      return prisma.election.findMany({
         select: electionSelect,
         orderBy: { createdAt: 'desc' },
      });
   }

   async create(payload: CreateElectionRequest, userId: string) {
      return prisma.election.create({
         data: {
            ...payload,
            startsAt: new Date(payload.startsAt),
            endsAt: new Date(payload.endsAt),
            originalEndsAt: new Date(payload.endsAt),
            debateAt: payload.debateAt ? new Date(payload.debateAt) : null,
            secondDebateAt: payload.secondDebateAt ? new Date(payload.secondDebateAt) : null,
            createdBy: userId,
         },
         select: electionSelect,
      });
   }

   async updateVotingEnd(id: string, endsAt: Date, userId: string) {
      const updated = await prisma.election.updateMany({
         where: {
            id,
            status: { in: ['DRAFT', 'OPEN'] },
            originalEndsAt: { lte: endsAt },
            startsAt: { lt: endsAt },
         },
         data: { endsAt, updatedBy: userId },
      });
      if (!updated.count) {
         const election = await prisma.election.findUnique({
            where: { id },
            select: { status: true, startsAt: true, originalEndsAt: true },
         });
         if (!election) throw new AppError('Election not found', 404);
         if (election.status !== 'DRAFT' && election.status !== 'OPEN') {
            throw new AppError(
               'Voting end can be edited only in draft or open elections',
               409,
               'INVALID_ELECTION_STATE',
            );
         }
         if (endsAt < election.originalEndsAt)
            throw new AppError('endsAt must not precede originalEndsAt', 400);
         throw new AppError('endsAt must be after startsAt', 400);
      }
      return prisma.election.findUniqueOrThrow({
         where: { id },
         select: electionSelect,
      });
   }

   async update(
      id: string,
      payload: UpdateElectionRequest,
      userId: string,
      statuses: Array<'DRAFT' | 'OPEN'> = ['DRAFT'],
   ) {
      return prisma.election.update({
         where: { id, status: { in: statuses } },
         data: {
            ...payload,
            ...(payload.startsAt && { startsAt: new Date(payload.startsAt) }),
            ...(payload.endsAt && { endsAt: new Date(payload.endsAt) }),
            ...(payload.debateAt !== undefined && {
               debateAt: payload.debateAt ? new Date(payload.debateAt) : null,
            }),
            ...(payload.secondDebateAt !== undefined && {
               secondDebateAt: payload.secondDebateAt ? new Date(payload.secondDebateAt) : null,
            }),
            updatedBy: userId,
         },
         select: electionSelect,
      });
   }

   async createCandidate(electionId: string, payload: CreateCandidateRequest) {
      return prisma.$transaction(
         async (tx) => {
            const election = await tx.election.findUnique({
               where: { id: electionId },
               select: { status: true },
            });
            if (!election) throw new AppError('Election not found', 404);
            if (election.status !== 'DRAFT') {
               throw new AppError(
                  'Candidates can be edited only in draft elections',
                  409,
                  'INVALID_ELECTION_STATE',
               );
            }
            return tx.electionCandidate.create({
               data: { electionId, ...payload },
               select: candidateSelect,
            });
         },
         { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
   }

   async updateCandidate(id: string, payload: UpdateCandidateRequest) {
      return prisma.$transaction(
         async (tx) => {
            const candidate = await tx.electionCandidate.findUnique({
               where: { id },
               select: { election: { select: { status: true } } },
            });
            if (!candidate) throw new AppError('Candidate not found', 404);
            assertCandidateEditable(candidate.election.status);
            if ('ballotNumber' in payload)
               throw new AppError(
                  'Ballot number cannot be changed',
                  409,
                  'BALLOT_NUMBER_IMMUTABLE',
               );
            return tx.electionCandidate.update({
               where: { id },
               data: payload,
               select: candidateSelect,
            });
         },
         { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
   }

   async transition(
      id: string,
      expectedStatus: 'DRAFT' | 'OPEN' | 'CLOSED',
      nextStatus: 'OPEN' | 'CLOSED' | 'PUBLISHED',
      userId: string,
   ) {
      try {
         return await prisma.$transaction(
            async (tx) => {
               const election = await tx.election.findUnique({
                  where: { id },
                  select: {
                     status: true,
                     startsAt: true,
                     endsAt: true,
                     _count: {
                        select: { candidates: { where: { isActive: true } } },
                     },
                  },
               });
               if (!election) throw new AppError('Election not found', 404);
               if (election.status !== expectedStatus) {
                  throw new AppError(
                     `Election must be ${expectedStatus.toLowerCase()}`,
                     409,
                     'INVALID_ELECTION_STATE',
                  );
               }
               if (nextStatus === 'OPEN' && election._count.candidates < 2) {
                  throw new AppError(
                     'At least two active candidates are required',
                     409,
                     'INSUFFICIENT_CANDIDATES',
                  );
               }
               if (nextStatus === 'OPEN') {
                  if (election.endsAt <= new Date()) {
                     throw new AppError(
                        'Election end time must be in the future',
                        409,
                        'INVALID_ELECTION_WINDOW',
                     );
                  }
                  const open = await tx.election.findFirst({
                     where: { status: 'OPEN', id: { not: id } },
                     select: { id: true },
                  });
                  if (open) {
                     throw new AppError(
                        'Close the open election before opening another',
                        409,
                        'ELECTION_ALREADY_OPEN',
                     );
                  }
               }

               const now = new Date();
               return tx.election.update({
                  where: { id },
                  data: {
                     status: nextStatus,
                     updatedBy: userId,
                     ...(nextStatus === 'OPEN' && { openedAt: now }),
                     ...(nextStatus === 'CLOSED' && { closedAt: now }),
                     ...(nextStatus === 'PUBLISHED' && { publishedAt: now }),
                  },
                  select: electionSelect,
               });
            },
            { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
         );
      } catch (error) {
         if (
            nextStatus === 'OPEN' &&
            error instanceof Prisma.PrismaClientKnownRequestError &&
            (error.code === 'P2034' ||
               (error.code === 'P2002' &&
                  String(error.meta?.target).includes(
                     'elections_one_open_idx',
                  )))
         ) {
            const open = await prisma.election.findFirst({
               where: { status: 'OPEN', id: { not: id } },
               select: { id: true },
            });
            if (open)
               throw new AppError(
                  'Close the open election before opening another',
                  409,
                  'ELECTION_ALREADY_OPEN',
               );
         }
         throw error;
      }
   }

   async findEligibilityUser(userId: string) {
      return prisma.user.findUnique({
         where: { id: userId },
         select: eligibilityUserSelect,
      });
   }

   async findParticipation(electionId: string, userId: string) {
      return prisma.electionParticipation.findUnique({
         where: { electionId_userId: { electionId, userId } },
         select: { receiptCode: true, votedAt: true },
      });
   }

   async castVote(
      electionId: string,
      candidateId: string,
      userId: string,
      receiptCode: string,
   ) {
      return prisma.$transaction(
         async (tx) => {
            const [election, candidate, user] = await Promise.all([
               tx.election.findUnique({
                  where: { id: electionId },
                  select: { status: true, startsAt: true, endsAt: true },
               }),
               tx.electionCandidate.findFirst({
                  where: { id: candidateId, electionId, isActive: true },
                  select: { id: true },
               }),
               tx.user.findUnique({
                  where: { id: userId },
                  select: eligibilityUserSelect,
               }),
            ]);

            if (!election) throw new AppError('Election not found', 404);
            const now = new Date();
            if (
               election.status !== 'OPEN' ||
               now < election.startsAt ||
               now >= election.endsAt
            ) {
               throw new AppError(
                  'Election is not open',
                  409,
                  'ELECTION_NOT_OPEN',
               );
            }
            if (!candidate) {
               throw new AppError(
                  'Invalid candidate',
                  400,
                  'INVALID_CANDIDATE',
               );
            }
            if (!user) throw new AppError('User not found', 404);
            const reason = getElectionEligibilityReason(user);
            if (reason) throw new AppError('Not eligible to vote', 403, reason);

            const participation = await tx.electionParticipation.create({
               data: { electionId, userId, receiptCode },
               select: { receiptCode: true, votedAt: true },
            });
            await tx.electionBallot.create({
               data: { electionId, candidateId },
               select: { id: true },
            });
            return participation;
         },
         { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
   }

   async turnout(electionId: string) {
      const [election, participationCount, ballotCount, eligibleVoters] =
         await prisma.$transaction([
            prisma.election.findUnique({
               where: { id: electionId },
               select: { id: true },
            }),
            prisma.electionParticipation.count({ where: { electionId } }),
            prisma.electionBallot.count({ where: { electionId } }),
            prisma.$queryRaw<Array<{ count: bigint }>>`
               SELECT COUNT(*)::bigint AS count
               FROM "users" AS u
               LEFT JOIN "study_programs" AS sp ON sp.id = u."studyProgramId"
               WHERE u.status = 'ACTIVE'
                  AND u."institutionType" = 'BINUS'
                  AND ((u."memberType" = 'STUDENT' AND sp.name IN (${Prisma.join(socsStudyProgramNames)}))
                    OR (u."memberType" = 'LECTURER' AND trim(regexp_replace(regexp_replace(
                      trim(regexp_replace(lower(u.department), '[[:space:]]+', ' ', 'g')),
                      ${departmentPrefix}, ''), ${departmentSuffix}, '')) IN (${Prisma.join(socsDepartmentNames)})))
                 AND u."registrationCompletedAt" IS NOT NULL
                 AND u."outlookEmailVerified" = true
                 AND u."outlookEmail" IS NOT NULL
                 AND split_part(lower(trim(u."outlookEmail")), '@', 2) IN ('binus.ac.id', 'binus.edu')
                 AND length(trim(split_part(u."outlookEmail", '@', 1))) > 0
                 AND length(u."outlookEmail") - length(replace(u."outlookEmail", '@', '')) = 1
            `,
         ]);
      if (!election) throw new AppError('Election not found', 404);

      return {
         participationCount,
         eligibleVoterCount: Number(eligibleVoters[0]?.count ?? 0),
         ballotCount,
      };
   }

   async tally(electionId: string) {
      const [election, participationCount, ballotCount, grouped] =
         await prisma.$transaction([
            prisma.election.findUnique({
               where: { id: electionId },
               select: { id: true, status: true },
            }),
            prisma.electionParticipation.count({ where: { electionId } }),
            prisma.electionBallot.count({ where: { electionId } }),
            prisma.electionBallot.groupBy({
               by: ['candidateId'],
               where: { electionId },
               orderBy: { candidateId: 'asc' },
               _count: { candidateId: true },
            }),
         ]);
      if (!election) throw new AppError('Election not found', 404);

      const candidates = await prisma.electionCandidate.findMany({
         where: { electionId },
         select: candidateSelect,
         orderBy: { ballotNumber: 'asc' },
      });
      const groupedCounts = grouped as Array<{
         candidateId: string;
         _count: { candidateId: number };
      }>;
      const counts = new Map(
         groupedCounts.map((item) => [
            item.candidateId,
            item._count.candidateId,
         ]),
      );
      const results = candidates.map((candidate) => ({
         candidate,
         votes: counts.get(candidate.id) ?? 0,
      }));
      const countedVotes = results.reduce((sum, item) => sum + item.votes, 0);

      return {
         status: election.status,
         participationCount,
         ballotCount,
         countedVotes,
         valid:
            participationCount === ballotCount && ballotCount === countedVotes,
         results,
      };
   }
}

export const electionRepository = new ElectionRepository();
