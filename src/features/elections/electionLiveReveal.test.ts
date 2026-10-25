import assert from 'node:assert/strict';
import { describe, it, mock } from 'node:test';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/config/prisma.js';
import { generateOpenApiDocument } from '@/docs/openapi.js';
import { AppError } from '@/utils/appError.js';
import { UpdateLiveRevealSchema } from './electionSchema.js';
import { electionRepository } from './electionRepository.js';
import { electionService } from './electionService.js';

describe('election live reveal', () => {
   it('accepts only an explicit boolean and rejects unrelated updates', () => {
      for (const value of [true, false]) {
         assert.deepEqual(
            UpdateLiveRevealSchema.parse({
               removeCountdownForLiveReveal: value,
            }),
            {
               removeCountdownForLiveReveal: value,
            },
         );
      }
      for (const body of [
         {},
         { removeCountdownForLiveReveal: 'false' },
         { removeCountdownForLiveReveal: null },
         { removeCountdownForLiveReveal: true, status: 'PUBLISHED' },
      ]) {
         assert.equal(UpdateLiveRevealSchema.safeParse(body).success, false);
      }
   });

   it('documents a protected toggle and includes the flag in public responses', () => {
      const document = generateOpenApiDocument();
      const route =
         document.paths?.['/api/internal/elections/{electionId}/live-reveal']
            ?.patch;
      assert.ok(route, 'Live reveal endpoint is missing');
      assert.ok(route.security?.length);
      assert.match(
         JSON.stringify(document.paths?.['/api/elections/current']),
         /removeCountdownForLiveReveal/,
      );
   });

   it('persists both toggle values in every stage without updating election lifecycle', async () => {
      const original = prisma.election.update;
      const update = mock.fn(
         async (args: Prisma.ElectionUpdateArgs) => args.data,
      );
      prisma.election.update = update as unknown as typeof original;
      try {
         for (const status of ['DRAFT', 'OPEN', 'CLOSED', 'PUBLISHED']) {
            const get = mock.method(
               electionService,
               'get',
               async () =>
                  ({ id: 'election-1', status }) as Awaited<
                     ReturnType<typeof electionService.get>
                  >,
            );
            try {
               for (const value of [true, false]) {
                  const result = await electionService.updateLiveReveal(
                     'election-1',
                     { removeCountdownForLiveReveal: value },
                     'admin-1',
                  );
                  assert.deepEqual(result, {
                     removeCountdownForLiveReveal: value,
                     updatedBy: 'admin-1',
                  });
                  const args = update.mock.calls.at(-1)!.arguments[0];
                  assert.deepEqual(args.where, { id: 'election-1' });
                  assert.equal(args.select?.removeCountdownForLiveReveal, true);
               }
            } finally {
               get.mock.restore();
            }
         }
      } finally {
         prisma.election.update = original;
      }
   });

   it('does not attempt to update a missing election', async () => {
      const get = mock.method(electionService, 'get', async () => {
         throw new AppError('Election not found', 404);
      });
      const update = mock.method(
         electionRepository,
         'updateLiveReveal',
         async () => {
            throw new Error('Unexpected write');
         },
      );
      try {
         await assert.rejects(
            electionService.updateLiveReveal(
               'missing',
               { removeCountdownForLiveReveal: true },
               'admin-1',
            ),
            (error: unknown) =>
               error instanceof AppError && error.statusCode === 404,
         );
         assert.equal(update.mock.callCount(), 0);
      } finally {
         get.mock.restore();
         update.mock.restore();
      }
   });
});
