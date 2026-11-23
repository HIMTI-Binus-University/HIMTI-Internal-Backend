import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import express from 'express';
import {
   KIT_SESSION_COOKIE,
   KIT_SESSION_TTL_SECONDS,
   createKitSessionToken,
   kitSessionLogout,
   kitSessionStatus,
   readCookie,
   requireKitAccess,
   setKitSessionCookie,
   verifyKitSessionToken,
} from './himtiKitSession.js';

process.env.BETTER_AUTH_SECRET ||= 'test-secret-for-himti-kit-session';

const identity = { nim: '2501234567', name: 'Budi Santoso' };

describe('HIMTI Kit session token', () => {
   it('round-trips a signed token', () => {
      const payload = verifyKitSessionToken(createKitSessionToken(identity));
      assert.equal(payload?.nim, identity.nim);
      assert.equal(payload?.name, identity.name);
   });

   it('expires after exactly 7 days', () => {
      const issuedAt = new Date('2026-01-01T00:00:00Z');
      const token = createKitSessionToken(identity, issuedAt);
      const justBefore = new Date(issuedAt.getTime() + (KIT_SESSION_TTL_SECONDS - 1) * 1000);
      const atExpiry = new Date(issuedAt.getTime() + KIT_SESSION_TTL_SECONDS * 1000);
      assert.equal(KIT_SESSION_TTL_SECONDS, 604800);
      assert.ok(verifyKitSessionToken(token, justBefore));
      assert.equal(verifyKitSessionToken(token, atExpiry), null);
   });

   it('rejects tampered, malformed and re-signed tokens', () => {
      const token = createKitSessionToken(identity);
      const [encoded, signature] = token.split('.');
      const forged = Buffer.from(
         JSON.stringify({ nim: 'attacker', name: 'x', exp: 9999999999 }),
      ).toString('base64url');
      assert.equal(verifyKitSessionToken(`${forged}.${signature}`), null);
      assert.equal(verifyKitSessionToken(`${encoded}.${signature}x`), null);
      assert.equal(verifyKitSessionToken(`${encoded}.`), null);
      assert.equal(verifyKitSessionToken('garbage'), null);
      assert.equal(verifyKitSessionToken(`${token}.extra`), null);
      assert.equal(verifyKitSessionToken(undefined), null);
   });

   it('rejects tokens signed with a different secret', () => {
      const original = process.env.BETTER_AUTH_SECRET;
      const token = createKitSessionToken(identity);
      process.env.BETTER_AUTH_SECRET = 'a-different-secret';
      try {
         assert.equal(verifyKitSessionToken(token), null);
      } finally {
         process.env.BETTER_AUTH_SECRET = original;
      }
   });

   it('reads a named cookie from a Cookie header', () => {
      assert.equal(readCookie('a=1; b=two%20words; c=3', 'b'), 'two words');
      assert.equal(readCookie('a=1', 'missing'), undefined);
      assert.equal(readCookie(undefined, 'a'), undefined);
   });
});

describe('HIMTI Kit session HTTP behaviour', () => {
   let server: Server;
   let base: string;

   before(async () => {
      const app = express();
      app.get('/login', (_req, res) => {
         setKitSessionCookie(res, identity);
         res.json({ ok: true });
      });
      app.get('/session', kitSessionStatus);
      app.post('/logout', kitSessionLogout);
      app.get('/protected', requireKitAccess, (_req, res) => {
         res.json({ success: true });
      });
      server = app.listen(0);
      base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
   });

   after(() => {
      server.close();
   });

   it('issues an httpOnly, SameSite=Lax, 7-day cookie', async () => {
      const response = await fetch(`${base}/login`);
      const cookie = response.headers.get('set-cookie') ?? '';
      assert.ok(cookie.startsWith(`${KIT_SESSION_COOKIE}=`));
      assert.match(cookie, /HttpOnly/i);
      assert.match(cookie, /SameSite=Lax/i);
      assert.match(cookie, /Path=\//i);
      assert.match(cookie, new RegExp(`Max-Age=${KIT_SESSION_TTL_SECONDS}`, 'i'));
   });

   it('returns 401 without a session cookie', async () => {
      for (const path of ['/protected', '/session']) {
         const response = await fetch(`${base}${path}`);
         assert.equal(response.status, 401);
         assert.equal((await response.json()).code, 'AUTHENTICATION_REQUIRED');
      }
   });

   it('lets a valid session through and reports the identity', async () => {
      const login = await fetch(`${base}/login`);
      const cookie = (login.headers.get('set-cookie') ?? '').split(';')[0];

      const protectedResponse = await fetch(`${base}/protected`, { headers: { cookie } });
      assert.equal(protectedResponse.status, 200);

      const status = await fetch(`${base}/session`, { headers: { cookie } });
      assert.equal(status.status, 200);
      const body = await status.json();
      assert.equal(body.data.nim, identity.nim);
      assert.equal(body.data.name, identity.name);
   });

   it('logout clears the cookie', async () => {
      const response = await fetch(`${base}/logout`, { method: 'POST' });
      assert.equal(response.status, 200);
      const cookie = response.headers.get('set-cookie') ?? '';
      assert.ok(cookie.startsWith(`${KIT_SESSION_COOKIE}=;`));
      assert.match(cookie, /Expires=Thu, 01 Jan 1970/i);
   });
});
