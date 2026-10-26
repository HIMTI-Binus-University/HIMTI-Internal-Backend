import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { seedElection } from './seed-election.mjs';

function database() {
   const state = { elections: [], users: [], participations: [], ballots: [] };
   const prisma = {
      state,
      async $transaction(run) {
         const before = structuredClone(state);
         try {
            return await run(prisma);
         } catch (error) {
            Object.assign(state, before);
            throw error;
         }
      },
      studyProgram: {
         findUnique: async () => ({
            id: 'socs',
            name: 'Computer Science - Regular Class',
         }),
      },
      user: {
         findUnique: async () => ({ id: 'system' }),
         async upsert({ where, create }) {
            const user = state.users.find((item) => item.id === where.id);
            if (user) return user;
            state.users.push(create);
            return create;
         },
      },
      election: {
         findUnique: async ({ where }) =>
            state.elections.find((item) => item.id === where.id),
         findFirst: async ({ where }) =>
            state.elections.find(
               (item) =>
                  item.status === where.status && item.id !== where.id.not,
            ),
         async upsert({ where, create, update }) {
            const election = state.elections.find(
               (item) => item.id === where.id,
            );
            if (election) {
               if (
                  update.originalEndsAt &&
                  update.originalEndsAt.getTime() !==
                     election.originalEndsAt.getTime()
               ) {
                  throw new Error('originalEndsAt is immutable');
               }
               Object.assign(election, update);
               return election;
            }
            state.elections.push(create);
            return create;
         },
      },
      electionCandidate: {
         async upsert({ where, create, update }) {
            const election = state.elections.find(
               (item) => item.id === create.electionId,
            );
            election.candidates ??= { create: [] };
            const candidate = election.candidates.create.find(
               (item) => item.id === where.id,
            );
            if (candidate) return Object.assign(candidate, update);
            election.candidates.create.push(create);
            return create;
         },
      },
      electionParticipation: {
         async createMany({ data }) {
            state.participations.push(...data);
         },
         async deleteMany({ where }) {
            state.participations = state.participations.filter(
               (item) => item.electionId !== where.electionId,
            );
         },
      },
      electionBallot: {
         async createMany({ data }) {
            state.ballots.push(...data);
         },
         async deleteMany({ where }) {
            state.ballots = state.ballots.filter(
               (item) => item.electionId !== where.electionId,
            );
         },
      },
   };
   return prisma;
}

test('seeds an open, mid-election fixture with anonymous ballots and eligible voters', async () => {
   const db = database();
   await seedElection(db);
   const election = db.state.elections[0];
   assert.equal(election.status, 'OPEN');
   assert.ok(election.startsAt < new Date());
   assert.ok(election.endsAt > new Date());
   assert.equal(election.closedAt, null);
   assert.equal(election.publishedAt, null);
   assert.equal(election.candidates.create.length, 3);
   assert.equal(db.state.participations.length, 30);
   assert.equal(db.state.ballots.length, 30);
   assert.equal(db.state.users.length, 40);
   assert.equal(
      new Set(db.state.participations.map((item) => item.userId)).size,
      30,
   );
   const counts = election.candidates.create.map(
      (candidate) =>
         db.state.ballots.filter((item) => item.candidateId === candidate.id)
            .length,
   );
   assert.deepEqual(counts, [15, 10, 5]);
   for (const ballot of db.state.ballots) {
      assert.equal('userId' in ballot, false);
      assert.equal('receiptCode' in ballot, false);
   }
   for (const voter of db.state.users) {
      assert.equal(voter.institutionType, 'BINUS');
      assert.equal(voter.memberType, 'STUDENT');
      assert.equal(voter.studyProgramId, 'socs');
      assert.equal(voter.outlookEmailVerified, true);
      assert.ok(voter.registrationCompletedAt);
      assert.ok(voter.email.endsWith('@example.invalid'));
   }
});

test('reruns preserve votes and the admin-controlled election state', async () => {
   const db = database();
   await seedElection(db);
   db.state.elections[0].status = 'PUBLISHED';
   db.state.ballots.push({
      electionId: db.state.elections[0].id,
      candidateId: 'manual-vote',
   });
   const before = structuredClone(db.state);
   await seedElection(db);
   assert.deepEqual(db.state, before);
});

test('reset removes manual demo votes, reopens it, and preserves unrelated records', async () => {
   const db = database();
   await seedElection(db);
   const id = db.state.elections[0].id;
   db.state.elections[0].status = 'PUBLISHED';
   db.state.elections[0].candidates.create[0].photoUrl =
      'https://example.com/admin.jpg';
   const unrelated = { id: 'real-election', status: 'CLOSED' };
   db.state.elections.push(unrelated);
   db.state.ballots.push({ electionId: id, candidateId: 'manual-vote' });
   db.state.participations.push({ electionId: id, userId: 'real-user' });
   db.state.ballots.push({
      electionId: unrelated.id,
      candidateId: 'real-candidate',
   });
   db.state.participations.push({
      electionId: unrelated.id,
      userId: 'real-user',
   });
   await seedElection(db, { reset: true });
   assert.deepEqual(
      db.state.elections.find((item) => item.id === unrelated.id),
      unrelated,
   );
   assert.equal(
      db.state.elections.find((item) => item.id === id).status,
      'OPEN',
   );
   assert.equal(
      db.state.elections.find((item) => item.id === id).candidates.create[0]
         .photoUrl,
      'https://example.com/admin.jpg',
   );
   assert.equal(
      db.state.ballots.filter((item) => item.electionId === id).length,
      30,
   );
   assert.equal(
      db.state.participations.filter((item) => item.electionId === id).length,
      30,
   );
   assert.equal(
      db.state.ballots.filter((item) => item.electionId === unrelated.id)
         .length,
      1,
   );
   assert.equal(
      db.state.participations.filter((item) => item.electionId === unrelated.id)
         .length,
      1,
   );
   assert.equal(db.state.users.length, 40);
});

test('another open election blocks seeding/reset without changing data', async () => {
   const db = database();
   await seedElection(db);
   db.state.elections.push({ id: 'real-election', status: 'OPEN' });
   const before = structuredClone(db.state);
   await assert.rejects(seedElection(db, { reset: true }), /open election/i);
   assert.deepEqual(db.state, before);
});

test('reset refreshes the window without changing the immutable original end', async () => {
   const db = database();
   await seedElection(db);
   const original = new Date('2020-01-01T00:00:00Z');
   db.state.elections[0].originalEndsAt = original;
   await seedElection(db, { reset: true });
   assert.deepEqual(db.state.elections[0].originalEndsAt, original);
   assert.ok(db.state.elections[0].endsAt > new Date());
});

test('a failure rolls back the reset instead of losing existing votes', async () => {
   const db = database();
   await seedElection(db);
   const before = structuredClone(db.state);
   db.electionBallot.createMany = async () => {
      throw new Error('write failed');
   };
   await assert.rejects(seedElection(db, { reset: true }), /write failed/);
   assert.deepEqual(db.state, before);
});

test('seed voter identity collisions never overwrite a real user', async () => {
   const db = database();
   await seedElection(db);
   db.state.users[0].email = 'real@example.com';
   const before = structuredClone(db.state);
   await assert.rejects(seedElection(db, { reset: true }), /identity/i);
   assert.deepEqual(db.state, before);
});

test('CLI refuses production, remote databases, and unknown arguments before writing', () => {
   for (const [args, env, message] of [
      [[], { NODE_ENV: 'production' }, /development or test/i],
      [
         [],
         {
            NODE_ENV: 'development',
            DATABASE_URL: 'postgresql://user:pass@remote.example/test',
         },
         /local database/i,
      ],
      [['--typo'], { NODE_ENV: 'development' }, /unknown option/i],
   ]) {
      const result = spawnSync(
         process.execPath,
         [
            fileURLToPath(new URL('./seed-election.mjs', import.meta.url)),
            ...args,
         ],
         { env: { ...process.env, ...env }, encoding: 'utf8' },
      );
      assert.equal(result.status, 1);
      assert.match(result.stderr, message);
   }
});
