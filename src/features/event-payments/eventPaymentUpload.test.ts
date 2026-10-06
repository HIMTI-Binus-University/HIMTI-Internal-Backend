import assert from 'node:assert/strict';
import { once } from 'node:events';
import { request } from 'node:http';
import test from 'node:test';
import express from 'express';
import type { ErrorRequestHandler } from 'express';
import { PAYMENT_PROOF_MAX_BYTES } from '@/features/events/eventService.js';
import { AppError } from '@/utils/appError.js';
import { parsePaymentProof } from './eventPaymentUpload.js';

// Exercises the route's actual parser without auth, database or file persistence.
test('payment proof multipart rejects adversarial uploads and recovers after abort', { timeout: 15_000 }, async (t) => {
   const app = express();
   let accepted = 0;
   let abortStarted: (() => void) | undefined;
   let abortHandled: ((error: unknown) => void) | undefined;
   app.post('/upload', (req, _res, next) => {
      if (req.headers['x-abort-test']) req.once('data', () => abortStarted?.());
      next();
   }, parsePaymentProof, (req, res) => {
      accepted++;
      res.json({ revision: req.body?.expectedRevision, size: req.file?.size });
   });
   const errors: ErrorRequestHandler = (error, req, res, _next) => {
      if (req.headers['x-abort-test']) abortHandled?.(error);
      if (!res.destroyed)
         res.status(error instanceof AppError ? error.statusCode : 500).json({ rejected: true });
   };
   app.use(errors);
   const server = app.listen(0, '127.0.0.1');
   await once(server, 'listening');
   const address = server.address();
   assert(address && typeof address === 'object');
   const url = `http://127.0.0.1:${address.port}/upload`;
   const sendProof = (size: number) => {
      const body = new FormData();
      body.append('file', new Blob([new Uint8Array(size)], { type: 'image/jpeg' }), 'proof.jpg');
      body.append('expectedRevision', '7');
      return fetch(url, { method: 'POST', body, signal: AbortSignal.timeout(5_000) });
   };
   try {
      await t.test('accepts a file and revision, including the exact size limit', async () => {
         for (const size of [11, PAYMENT_PROOF_MAX_BYTES]) {
            const response = await sendProof(size);
            assert.equal(response.status, 200);
            assert.deepEqual(await response.json(), { revision: '7', size });
         }
      });
      await t.test('rejects a file one byte over the configured limit', async () => {
         const before = accepted;
         const response = await sendProof(PAYMENT_PROOF_MAX_BYTES + 1);
         assert.equal(response.status, 413);
         assert.deepEqual(await response.json(), { rejected: true });
         assert.equal(accepted, before);
      });
      await t.test('rejects a missing boundary and a truncated file body', async () => {
         const before = accepted;
         for (const [contentType, body] of [
            ['multipart/form-data', 'invalid'],
            ['multipart/form-data; boundary=proof', '--proof\r\nContent-Disposition: form-data; name="file"; filename="proof.jpg"\r\nContent-Type: image/jpeg\r\n\r\ntruncated'],
         ]) {
            const response = await fetch(url, {
               method: 'POST', headers: { 'content-type': contentType! }, body,
               signal: AbortSignal.timeout(5_000),
            });
            assert.equal(response.status, 400);
            assert.deepEqual(await response.json(), { rejected: true });
         }
         assert.equal(accepted, before);
      });
      await t.test('finishes abort cleanup and accepts the next upload', async () => {
         const before = accepted;
         const started = new Promise<void>((resolve) => { abortStarted = resolve; });
         const handled = new Promise<unknown>((resolve) => { abortHandled = resolve; });
         const client = request(url, { method: 'POST', headers: {
            'content-type': 'multipart/form-data; boundary=proof',
            'content-length': PAYMENT_PROOF_MAX_BYTES,
            'x-abort-test': 'true',
         } });
         client.on('error', () => {}); // Expected socket hang-up from deliberate disconnect.
         try {
            client.write('--proof\r\nContent-Disposition: form-data; name="file"; filename="proof.jpg"\r\nContent-Type: image/jpeg\r\n\r\npartial');
            await started; // Abort only after the server has received a real partial upload.
            client.destroy();
            const error = await handled;
            assert(error instanceof AppError);
            assert.equal(error.statusCode, 400);
            assert.equal(accepted, before);
            const response = await sendProof(11);
            assert.equal(response.status, 200);
            assert.deepEqual(await response.json(), { revision: '7', size: 11 });
            assert.equal(accepted, before + 1);
         } finally {
            client.destroy();
         }
      });
   } finally {
      server.closeAllConnections();
      await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
   }
});
