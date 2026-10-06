import assert from 'node:assert/strict';
import { createHmac, randomUUID } from 'node:crypto';
import test from 'node:test';
import express from 'express';
import { toNodeHandler } from 'better-auth/node';
import type { BetterAuthOptions } from 'better-auth';

const enabled = process.env.AUTH_HTTP_REGRESSION === '1';

test('generic auth updates cannot alter status and existing sessions cannot bypass suspension', {
   skip: !enabled && 'Set AUTH_HTTP_REGRESSION=1 with the disposable revision database',
}, async () => {
   // Fail closed before importing Prisma or auth: this test must never touch a normal database.
   const database = new URL(process.env.DATABASE_URL ?? '');
   assert.equal(database.protocol, 'postgresql:');
   assert.equal(database.hostname, '127.0.0.1');
   assert.equal(database.port, '55436');
   assert.equal(database.username, 'revision');
   assert.equal(database.password, 'revision');
   assert.equal(database.pathname, '/revision');
   assert.equal(database.search, '');
   assert.equal(database.hash, '');

   process.env.BETTER_AUTH_SECRET = 'disposable-auth-http-regression-secret-only';
   process.env.BETTER_AUTH_URL = 'http://localhost:8000';
   process.env.ENABLE_DEV_AUTO_LOGIN = 'false';
   // Intentional module-loading boundary: static imports would initialize auth before fixture guards/env.
   const { prisma } = await import('@/config/prisma.js');
   const { auth } = await import('@/utils/auth.js');
   const { requireAuth } = await import('@/middleware/authMiddleware.js');
   // Exercise the stronger case: a previously issued ACTIVE user cookie cache.
   const sessionOptions: typeof auth.options.session & NonNullable<BetterAuthOptions['session']> = auth.options.session;
   sessionOptions.cookieCache = { enabled: true, maxAge: 300 };

   const app = express();
   app.use(express.json());
   app.all('/api/auth/*splat', toNodeHandler(auth));
   app.get('/protected', requireAuth, (_req, res) => {
      res.json({ userId: res.locals.user.id, status: res.locals.user.status });
   });
   const server = app.listen(0, '127.0.0.1');
   await new Promise<void>((resolve) => server.once('listening', resolve));
   const address = server.address();
   assert(address && typeof address === 'object');
   const origin = `http://127.0.0.1:${address.port}`;
   const userId = randomUUID();
   try {
      await prisma.user.create({ data: {
         id: userId,
         name: 'Auth regression participant',
         email: `${userId}@example.invalid`,
         status: 'ACTIVE',
         updatedAt: new Date(),
      } });
      const context = await auth.$context;
      const session = await context.internalAdapter.createSession(userId);
      assert(session);
      const signature = createHmac('sha256', context.secret).update(session.token).digest('base64');
      const tokenCookie = `${context.authCookies.sessionToken.name}=${encodeURIComponent(`${session.token}.${signature}`)}`;
      const headers = { cookie: tokenCookie, origin: 'http://localhost:8000', 'content-type': 'application/json' };

      const active = await fetch(`${origin}/protected`, { headers });
      assert.equal(active.status, 200);
      assert.deepEqual(await active.json(), { userId, status: 'ACTIVE' });

      const normalUpdate = await fetch(`${origin}/api/auth/update-user`, {
         method: 'POST', headers, body: JSON.stringify({ name: 'Updated participant' }),
      });
      assert.equal(normalUpdate.status, 200);
      assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: userId } })).name, 'Updated participant');
      const statusUpdate = await fetch(`${origin}/api/auth/update-user`, {
         method: 'POST', headers, body: JSON.stringify({ status: 'SUSPENDED' }),
      });
      assert.equal(statusUpdate.status, 400);
      assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: userId } })).status, 'ACTIVE');

      const cached = await fetch(`${origin}/api/auth/get-session`, { headers });
      assert.equal(cached.status, 200);
      assert.equal((await cached.json()).user.status, 'ACTIVE');
      const cacheCookie = cached.headers.getSetCookie()
         .map((cookie) => cookie.split(';', 1)[0])
         .filter((cookie) => cookie.startsWith(context.authCookies.sessionData.name));
      assert(cacheCookie.length > 0, 'HTTP get-session must issue a user cache cookie');
      const cachedHeaders = { ...headers, cookie: [tokenCookie, ...cacheCookie].join('; ') };

      // Administrative suspension keeps the existing session and stale ACTIVE cache intact.
      await prisma.user.update({ where: { id: userId }, data: { status: 'SUSPENDED' } });
      assert(await prisma.session.findUnique({ where: { token: session.token } }));
      const currentSession = await fetch(`${origin}/api/auth/get-session`, { headers: cachedHeaders });
      assert.equal(currentSession.status, 200);
      assert.equal((await currentSession.json()).user.status, 'SUSPENDED');
      const bypass = await fetch(`${origin}/api/auth/update-user`, {
         method: 'POST', headers: cachedHeaders, body: JSON.stringify({ status: 'ACTIVE' }),
      });
      assert.equal(bypass.status, 400);
      assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: userId } })).status, 'SUSPENDED');
      const suspended = await fetch(`${origin}/protected`, { headers: cachedHeaders });
      assert.equal(suspended.status, 403);
      assert.equal((await suspended.json()).code, 'ACCOUNT_INACTIVE');
   } finally {
      await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
      try {
         await prisma.user.deleteMany({ where: { id: userId } });
      } finally {
         await prisma.$disconnect();
      }
   }
});
