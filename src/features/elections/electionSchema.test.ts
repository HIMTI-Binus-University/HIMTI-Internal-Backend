import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
   CastVoteSchema,
   CreateElectionSchema,
   UpdateElectionSchema,
   UpdateDebateScheduleSchema,
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

   it('strictly requires a nullable offset debate datetime', () => {
      assert.equal(
         UpdateDebateScheduleSchema.safeParse({ debateAt: null }).success,
         true,
      );
      assert.equal(
         UpdateDebateScheduleSchema.safeParse({
            debateAt: '2027-01-10T08:00:00+07:00',
         }).success,
         true,
      );
      for (const body of [
         {},
         { debateAt: '2027-01-10T08:00:00' },
         { debateAt: null, updatedBy: 'forged-user' },
      ]) {
         assert.equal(
            UpdateDebateScheduleSchema.safeParse(body).success,
            false,
         );
      }
   });
});
