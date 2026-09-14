import assert from 'node:assert/strict';
import test from 'node:test';
import express from 'express';
import eventPackageRoutes from '@/features/event-packages/eventPackageRoutes.js';
import registrationFormRoutes from '@/features/registration-forms/registrationFormRoutes.js';

test('event management routers do not intercept participant user routes', async () => {
   const app = express();
   app.use(eventPackageRoutes);
   app.use(registrationFormRoutes);
   app.get('/user/me', (_req, res) => res.json({ reached: true }));

   const server = app.listen(0);
   try {
      const address = server.address();
      assert(address && typeof address === 'object');
      const response = await fetch(`http://127.0.0.1:${address.port}/user/me`);

      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), { reached: true });
   } finally {
      server.close();
   }
});

test('event management routes remain protected after scoping middleware', async () => {
   const app = express();
   app.use(eventPackageRoutes);
   app.use(registrationFormRoutes);

   const server = app.listen(0);
   try {
      const address = server.address();
      assert(address && typeof address === 'object');
      const origin = `http://127.0.0.1:${address.port}`;
      const responses = await Promise.all([
         fetch(`${origin}/internal/events/event-id/packages`),
         fetch(`${origin}/internal/events/event-id/registration-form`),
      ]);

      assert.deepEqual(
         responses.map(({ status }) => status),
         [401, 401],
      );
   } finally {
      server.close();
   }
});
