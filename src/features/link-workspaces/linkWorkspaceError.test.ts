import assert from 'node:assert/strict';
import { it } from 'node:test';
import { Prisma } from '@prisma/client';
import type { Request, Response } from 'express';
import { globalErrorHandler } from '@/middleware/errorMiddleware.js';

it('maps Prisma serialization conflicts to a retryable 409 response', () => {
   const body: { statusCode?: number; payload?: unknown } = {};
   const response = {
      status(statusCode: number) {
         body.statusCode = statusCode;
         return this;
      },
      json(payload: unknown) {
         body.payload = payload;
         return this;
      },
   } as unknown as Response;
   const error = new Prisma.PrismaClientKnownRequestError(
      'Transaction conflict',
      { code: 'P2034', clientVersion: Prisma.prismaVersion.client },
   );

   globalErrorHandler(error, {} as Request, response, () => undefined);

   assert.equal(body.statusCode, 409);
   assert.deepEqual(body.payload, {
      status: 'fail',
      msg: 'The operation conflicted with another update. Please retry.',
   });
});
