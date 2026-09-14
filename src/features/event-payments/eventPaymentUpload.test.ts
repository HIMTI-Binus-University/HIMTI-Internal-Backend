import assert from 'node:assert/strict';
import test from 'node:test';
import express from 'express';
import multer from 'multer';
import { PAYMENT_PROOF_MAX_BYTES } from '@/features/events/eventService.js';

test('payment proof multipart accepts one file and expected revision', async () => {
   const app = express();
   const upload = multer({
      storage: multer.memoryStorage(),
      limits: { fileSize: PAYMENT_PROOF_MAX_BYTES, files: 1, fields: 1 },
   });
   app.post('/upload', (req, res) =>
      upload.single('file')(req, res, (error) =>
         res.status(error ? 400 : 200).json({
            code: error instanceof multer.MulterError ? error.code : null,
            revision: req.body?.expectedRevision,
            size: req.file?.size,
         }),
      ),
   );
   const server = app.listen(0);
   try {
      const address = server.address();
      assert(address && typeof address === 'object');
      const body = new FormData();
      body.append(
         'file',
         new Blob(['small proof'], { type: 'image/jpeg' }),
         'proof.jpg',
      );
      body.append('expectedRevision', '7');
      const response = await fetch(`http://127.0.0.1:${address.port}/upload`, {
         method: 'POST',
         body,
      });

      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), {
         code: null,
         revision: '7',
         size: 11,
      });
   } finally {
      server.close();
   }
});
