import assert from 'node:assert/strict';
import { afterEach, describe, it, mock } from 'node:test';
import { eventCommitteeRepository } from './eventCommitteeRepository.js';
import { eventCommitteeService } from './eventCommitteeService.js';

afterEach(() => mock.restoreAll());

const membership = (
   role: Parameters<typeof eventCommitteeService.isSteeringCommitteeRole>[0],
) => ({
   eventId: 'event-1',
   userId: 'user-1',
   role,
   assignedAt: new Date(),
   user: {
      id: 'user-1',
      name: 'User',
      email: 'user@example.com',
      image: null,
   },
});

describe('event committee authorization', () => {
   it('allows assigned committee members to view an event', async () => {
      mock.method(eventCommitteeRepository, 'findEventById', async () => ({
         id: 'event-1',
         createdBy: 'creator',
      }));
      mock.method(eventCommitteeRepository, 'findMembership', async () =>
         membership('STAFF'),
      );

      const result = await eventCommitteeService.assertEventCommitteeMember(
         'event-1',
         'user-1',
      );

      assert.equal(result?.role, 'STAFF');
   });

   it('denies users who are not assigned to the event', async () => {
      mock.method(eventCommitteeRepository, 'findEventById', async () => ({
         id: 'event-1',
         createdBy: 'creator',
      }));
      mock.method(eventCommitteeRepository, 'findMembership', async () => null);

      await assert.rejects(
         eventCommitteeService.assertEventCommitteeMember(
            'event-1',
            'unassigned',
         ),
         (error: unknown) =>
            error instanceof Error &&
            'statusCode' in error &&
            error.statusCode === 403,
      );
   });

   it('allows the historical event creator to manage the event', async () => {
      mock.method(eventCommitteeRepository, 'findEventById', async () => ({
         id: 'event-1',
         createdBy: 'creator',
      }));
      mock.method(eventCommitteeRepository, 'findMembership', async () =>
         membership('STAFF'),
      );

      await assert.doesNotReject(
         eventCommitteeService.assertEventSteeringCommitteeMember(
            'event-1',
            'creator',
         ),
      );
   });

   it('allows steering roles and denies non-steering roles from management', async () => {
      mock.method(eventCommitteeRepository, 'findEventById', async () => ({
         id: 'event-1',
         createdBy: 'creator',
      }));
      const membershipMock = mock.method(
         eventCommitteeRepository,
         'findMembership',
         async () => membership('CHAIRPERSON'),
      );

      await assert.doesNotReject(
         eventCommitteeService.assertEventSteeringCommitteeMember(
            'event-1',
            'user-1',
         ),
      );

      membershipMock.mock.mockImplementation(async () => membership('STAFF'));

      await assert.rejects(
         eventCommitteeService.assertEventSteeringCommitteeMember(
            'event-1',
            'user-1',
         ),
         (error: unknown) =>
            error instanceof Error &&
            'statusCode' in error &&
            error.statusCode === 403,
      );
   });

   it('allows Admin override only for events that exist', async () => {
      const eventMock = mock.method(
         eventCommitteeRepository,
         'findEventById',
         async () => ({ id: 'event-1', createdBy: 'creator' }),
      );
      const membershipMock = mock.method(
         eventCommitteeRepository,
         'findMembership',
         async () => null,
      );

      await assert.doesNotReject(
         eventCommitteeService.assertEventSteeringCommitteeMemberOrAdmin(
            'event-1',
            { id: 'admin', roles: ['Admin'] },
         ),
      );
      assert.equal(membershipMock.mock.callCount(), 0);

      eventMock.mock.mockImplementation(async () => null);

      await assert.rejects(
         eventCommitteeService.assertEventSteeringCommitteeMemberOrAdmin(
            'missing',
            { id: 'admin', roles: ['Admin'] },
         ),
         (error: unknown) =>
            error instanceof Error &&
            'statusCode' in error &&
            error.statusCode === 404,
      );
   });
});
