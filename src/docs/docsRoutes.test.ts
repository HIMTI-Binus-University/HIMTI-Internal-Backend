import assert from 'node:assert/strict';
import test from 'node:test';
import express from 'express';
import docsRoutes from './docsRoutes.js';

test('docs middleware does not authenticate unrelated API routes', async () => {
   const app = express();
   app.use('/api', docsRoutes);
   app.get('/api/public', (_req, res) => res.json({ status: 'ok' }));

   const server = app.listen(0);

   try {
      const address = server.address();
      assert(address && typeof address !== 'string');

      const response = await fetch(
         `http://127.0.0.1:${address.port}/api/public`,
      );

      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), { status: 'ok' });
   } finally {
      await new Promise<void>((resolve, reject) => {
         server.close((error) => (error ? reject(error) : resolve()));
      });
   }
});
