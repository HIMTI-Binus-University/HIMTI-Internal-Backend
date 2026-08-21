import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildSubEventCommitteeWhere } from './subEventRepository.js';
import { mapSubEventResponse } from './subEventController.js';

const query = {
   page: 1,
   limit: 10,
   sort: 'date:asc',
};

describe('sub-event repository authorization scope', () => {
   it('limits non-admin lists through parent event access', () => {
      const where = buildSubEventCommitteeWhere(query, 'user-1', false);

      assert.deepEqual(where.event, {
         OR: [
            { createdBy: 'user-1' },
            { eventComittees: { some: { userId: 'user-1' } } },
         ],
      });
   });

   it('does not restrict Admin lists by parent event membership', () => {
      const where = buildSubEventCommitteeWhere(query, 'admin', true);

      assert.equal(where.event, undefined);
   });

   it('combines event, visibility, status, and search filters with access scope', () => {
      const where = buildSubEventCommitteeWhere(
         {
            ...query,
            eventId: 'event-1',
            status: 'OPEN',
            visibility: 'INTERNAL',
            search: 'workshop',
         },
         'user-1',
         false,
      );

      assert.equal(where.eventId, 'event-1');
      assert.equal(where.status, 'OPEN');
      assert.equal(where.visibility, 'INTERNAL');
      assert.ok(where.event);
      assert.ok(where.OR);
   });
});

describe('sub-event response serialization', () => {
   it('maps canonical payment amounts to JSON-safe decimal strings', () => {
      const response = mapSubEventResponse({
         id: 'sub-event-1',
         paymentAmountMinor: 150000n,
      });

      assert.equal(response.paymentAmountMinor, '150000');
      assert.doesNotThrow(() => JSON.stringify(response));
   });
});
