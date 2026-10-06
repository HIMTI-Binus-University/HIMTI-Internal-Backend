import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { prisma } from '@/config/prisma.js';
import { AppError } from '@/utils/appError.js';
import { electionRepository } from './electionRepository.js';
import { electionService } from './electionService.js';
import { UpdateCandidateSchema } from './electionSchema.js';
import type { UpdateCandidateRequest } from './electionTypes.js';

const enabled = process.env.ELECTION_REVISION_DB_TEST === '1';

// Never run this fixture against the developer's database or production.
test('SoCS electorate and immutable ballot numbers survive concurrent edits/state changes', { skip: !enabled }, async () => {
   const url = new URL(process.env.DATABASE_URL ?? '');
   assert.equal(url.hostname, '127.0.0.1');
   assert.equal(url.port, '55436');
   assert.equal(url.username, 'revision');
   assert.equal(url.password, 'revision');
   assert.equal(url.pathname, '/revision');
   const key = randomUUID();
   const userIds: string[] = [];
   const programIds: string[] = [];
   let electionId: string | undefined;
   const code = (expected: string) => (error: unknown) => error instanceof AppError && error.code === expected;
   try {
      const socs = await prisma.studyProgram.upsert({
         where: { name: 'Computer Science - Regular Class' },
         create: { name: 'Computer Science - Regular Class' }, update: {},
      });
      const other = await prisma.studyProgram.create({ data: { name: `Business ${key}` } });
      programIds.push(other.id);
      const studentRole = await prisma.role.findUniqueOrThrow({ where: { roleName: 'SoCS Student' } });
      const lecturerRole = await prisma.role.findUniqueOrThrow({ where: { roleName: 'SoCS Lecturer' } });
      for (const [index, studyProgramId] of [socs.id, other.id, null, null].entries()) {
         const user = await prisma.user.create({ data: {
            name: `Election fixture ${index}`, email: `${key}-${index}@example.test`,
            outlookEmail: `${key}-${index}@binus.ac.id`, outlookEmailVerified: true,
            registrationCompletedAt: new Date(), studyProgramId, memberType: index === 3 ? 'LECTURER' : 'STUDENT',
            department: 'School of Computer Science', studyProgramName: socs.name,
         } });
         userIds.push(user.id);
         if (index === 0 || index === 3) await prisma.userHasRole.create({ data: {
            userId: user.id, roleId: index === 3 ? lecturerRole.id : studentRole.id,
         } });
      }
      const start = new Date(Date.now() - 60000);
      const end = new Date(Date.now() + 3600000);
      const election = await prisma.election.create({ data: {
         slug: key, title: 'Isolated revision election', startsAt: start, endsAt: end,
         originalEndsAt: end, createdBy: userIds[0],
      } });
      electionId = election.id;
      const candidate = await electionRepository.createCandidate(election.id, {
         ballotNumber: 1, name: 'Original candidate', vision: 'Vision', mission: 'Mission',
      });
      assert.equal(UpdateCandidateSchema.safeParse({ ballotNumber: 1, name: 'Updated in draft' }).success, false);
      await assert.rejects(electionRepository.updateCandidate(candidate.id, { ballotNumber: 2 } as unknown as UpdateCandidateRequest), code('BALLOT_NUMBER_IMMUTABLE'));
      await electionRepository.updateCandidate(candidate.id, { name: 'Updated in draft' });
      await electionRepository.createCandidate(election.id, { ballotNumber: 2, name: 'Second candidate', vision: 'Vision', mission: 'Mission' });
      await electionRepository.transition(election.id, 'DRAFT', 'OPEN', userIds[0]);
      assert.equal((await electionService.getEligibility(election.id, userIds[0])).eligible, true);
      assert.equal((await electionService.getEligibility(election.id, userIds[3])).eligible, true);
      for (const userId of userIds.slice(1, 3)) {
         assert.equal((await electionService.getEligibility(election.id, userId)).reason, 'NOT_SOCS');
         await assert.rejects(electionRepository.castVote(election.id, candidate.id, userId, randomUUID()), code('NOT_SOCS'));
      }
      assert.equal((await electionRepository.turnout(election.id)).eligibleVoterCount, 2);
      await electionRepository.castVote(election.id, candidate.id, userIds[0], randomUUID());
      const turnout = await electionRepository.turnout(election.id);
      assert.equal(turnout.participationCount, 1);
      assert.equal(turnout.ballotCount, 1);
      assert.equal((await electionRepository.updateCandidate(candidate.id, { name: 'Updated in open', isActive: false })).name, 'Updated in open');
      const concurrent = await Promise.allSettled([
         electionRepository.updateCandidate(candidate.id, { ballotNumber: 2, name: 'Renumbered' } as unknown as UpdateCandidateRequest),
         electionRepository.updateCandidate(candidate.id, { ballotNumber: 3 } as unknown as UpdateCandidateRequest),
         electionRepository.updateCandidate(candidate.id, { slogan: 'Still number one' }),
         electionRepository.transition(election.id, 'OPEN', 'CLOSED', userIds[0]),
      ]);
      assert.equal(concurrent[0].status, 'rejected');
      assert.equal(concurrent[1].status, 'rejected');
      if (concurrent[3].status === 'rejected') {
         assert.equal(concurrent[3].reason.code, 'P2034');
         await electionRepository.transition(election.id, 'OPEN', 'CLOSED', userIds[0]);
      }
      const saved = await prisma.electionCandidate.findUniqueOrThrow({ where: { id: candidate.id } });
      assert.equal(saved.ballotNumber, 1);
      assert.equal(saved.name, 'Updated in open');
      assert.equal(saved.isActive, false);
      await assert.rejects(electionRepository.updateCandidate(candidate.id, { name: 'Too late' }), code('INVALID_ELECTION_STATE'));
   } finally {
      if (electionId) {
         await prisma.electionBallot.deleteMany({ where: { electionId } });
         await prisma.electionParticipation.deleteMany({ where: { electionId } });
         await prisma.electionCandidate.deleteMany({ where: { electionId } });
         await prisma.election.delete({ where: { id: electionId } });
      }
      await prisma.userHasRole.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
      await prisma.studyProgram.deleteMany({ where: { id: { in: programIds } } });
      await prisma.$disconnect();
   }
});
