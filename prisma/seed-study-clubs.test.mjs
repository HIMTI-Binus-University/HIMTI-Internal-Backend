import assert from 'node:assert/strict';
import test from 'node:test';
import { assertStudyClubSeedEnvironment } from './seed-study-clubs.mjs';

test('Study Club dummy data is restricted to local development databases', () => {
   for (const NODE_ENV of ['production', undefined]) {
      assert.throws(() =>
         assertStudyClubSeedEnvironment({
            NODE_ENV,
            DATABASE_URL: 'postgresql://localhost/demo',
         }),
      );
   }
   assert.throws(() =>
      assertStudyClubSeedEnvironment({
         NODE_ENV: 'development',
         DATABASE_URL: 'postgresql://remote.example/demo',
      }),
   );
   assert.throws(() =>
      assertStudyClubSeedEnvironment({
         NODE_ENV: 'development',
         DATABASE_URL: 'https://localhost/demo',
      }),
   );
   for (const host of ['localhost', '127.0.0.1', '[::1]', 'db']) {
      assert.doesNotThrow(() =>
         assertStudyClubSeedEnvironment({
            NODE_ENV: 'development',
            DATABASE_URL: `postgresql://${host}/demo`,
         }),
      );
   }
});
