import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildEventCommitteeWhere } from './eventRepository.js';

const query = {
   page: 1,
   limit: 10,
   sort: 'createdAt:desc',
};

describe('event repository authorization scope', () => {
   it('limits non-admin lists to created or assigned events', () => {
      const where = buildEventCommitteeWhere(query, 'user-1', false);

      assert.deepEqual(where.OR, [
         { createdBy: 'user-1' },
         { eventComittees: { some: { userId: 'user-1' } } },
      ]);
   });

   it('does not restrict Admin event lists by committee membership', () => {
      const where = buildEventCommitteeWhere(query, 'admin', true);

      assert.equal(where.OR, undefined);
   });

   it('keeps committee scope when search filters are applied', () => {
      const where = buildEventCommitteeWhere(
         { ...query, search: 'seminar' },
         'user-1',
         false,
      );

      assert.ok(where.OR);
      assert.ok(where.AND);
   });
});
