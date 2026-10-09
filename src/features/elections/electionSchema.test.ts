import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
   CastVoteSchema,
   CreateCandidateSchema,
   CreateElectionSchema,
   UpdateElectionSchema,
   UpdateDebateScheduleSchema,
   UpdateVotingEndSchema,
} from './electionSchema.js';

describe('election request schemas', () => {
   it('requires a valid election window and slug', () => {
      assert.equal(
         CreateElectionSchema.safeParse({
            slug: 'chairman-election-2027',
            title: 'HIMTI Election 2027',
            startsAt: '2027-01-10T08:00:00+07:00',
            endsAt: '2027-01-10T20:00:00+07:00',
         }).success,
         true,
      );
      assert.equal(
         CreateElectionSchema.safeParse({
            slug: 'Invalid Slug',
            title: 'HIMTI Election 2027',
            startsAt: '2027-01-10T20:00:00+07:00',
            endsAt: '2027-01-10T08:00:00+07:00',
         }).success,
         false,
      );
   });

   it('rejects empty updates and server-controlled vote fields', () => {
      assert.equal(UpdateElectionSchema.safeParse({}).success, false);
      assert.equal(
         CastVoteSchema.safeParse({
            candidateId: 'candidate-1',
            userId: 'forged-user',
         }).success,
         false,
      );
   });

   it('uses ballot number as the only candidate ordering field', () => {
      const candidate = {
         ballotNumber: 1,
         name: 'Candidate One',
         photoUrl: null,
         vision: 'Vision',
         mission: 'Mission',
         videoUrl: null,
      };

      assert.equal(CreateCandidateSchema.safeParse(candidate).success, true);
      assert.equal(
         CreateCandidateSchema.safeParse({ ...candidate, position: 0 }).success,
         false,
      );
   });

   it('strictly requires nullable offset debate datetimes', () => {
      assert.equal(
         UpdateDebateScheduleSchema.safeParse({ debateAt: null }).success,
         true,
      );
      assert.equal(
         UpdateDebateScheduleSchema.safeParse({
            debateAt: '2027-01-10T08:00:00+07:00',
            secondDebateAt: '2027-01-11T08:00:00Z',
         }).success,
         true,
      );
      assert.equal(
         UpdateDebateScheduleSchema.safeParse({
            debateAt: null,
            secondDebateAt: null,
         }).success,
         true,
      );
      for (const body of [
         {},
         { debateAt: '2027-01-10T08:00:00' },
         { debateAt: null, secondDebateAt: '2027-01-11T08:00:00' },
         { debateAt: null, updatedBy: 'forged-user' },
      ]) {
         assert.equal(
            UpdateDebateScheduleSchema.safeParse(body).success,
            false,
         );
      }
   });
   it('requires an offset voting end and rejects baseline tampering', () => {
      assert.equal(UpdateVotingEndSchema.safeParse({ endsAt: '2027-01-10T20:00:00+07:00' }).success, true);
      for (const body of [
         {},
         { endsAt: '2027-01-10T20:00:00' },
         { endsAt: '2027-01-10T20:00:00+07:00', originalEndsAt: '2027-01-01T00:00:00Z' },
      ]) assert.equal(UpdateVotingEndSchema.safeParse(body).success, false);
   });
});
