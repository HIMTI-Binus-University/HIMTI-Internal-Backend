import { createHmac, timingSafeEqual } from 'node:crypto';
import type { CookieOptions, NextFunction, Request, Response } from 'express';
import { requireAuth } from '@/middleware/authMiddleware.js';
import { requirePermission } from '@/middleware/permissionMiddleware.js';

export const KIT_SESSION_COOKIE = 'himti_kit_session';
export const KIT_SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;

export interface KitSessionPayload {
   nim: string;
   name: string;
   /** Expiry as unix seconds. */
   exp: number;
}

export interface KitSessionIdentity {
   nim: string;
   name: string;
}

function getSigningKey(): string {
   const secret =
      process.env.HIMTI_KIT_SESSION_SECRET || process.env.BETTER_AUTH_SECRET;
   if (!secret) {
      throw new Error(
         'HIMTI_KIT_SESSION_SECRET or BETTER_AUTH_SECRET is required to sign HIMTI Kit sessions',
      );
   }
   // Domain-separate from better-auth, which signs with the same secret.
   return createHmac('sha256', secret).update('himti-kit-session:v1').digest('hex');
}

function sign(encodedPayload: string): string {
   return createHmac('sha256', getSigningKey())
      .update(encodedPayload)
      .digest('base64url');
}

export function createKitSessionToken(
   identity: KitSessionIdentity,
   now: Date = new Date(),
): string {
   const payload: KitSessionPayload = {
      nim: identity.nim,
      name: identity.name,
      exp: Math.floor(now.getTime() / 1000) + KIT_SESSION_TTL_SECONDS,
   };
   const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
   return `${encoded}.${sign(encoded)}`;
}

export function verifyKitSessionToken(
   token: string | undefined | null,
   now: Date = new Date(),
): KitSessionPayload | null {
   if (!token) return null;
   const [encoded, signature, ...rest] = token.split('.');
   if (!encoded || !signature || rest.length > 0) return null;

   const expected = Buffer.from(sign(encoded));
   const actual = Buffer.from(signature);
   if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
      return null;
   }

   try {
      const payload = JSON.parse(
         Buffer.from(encoded, 'base64url').toString('utf8'),
      ) as Partial<KitSessionPayload>;
      if (
         typeof payload.nim !== 'string' ||
         typeof payload.name !== 'string' ||
         typeof payload.exp !== 'number' ||
         payload.exp <= Math.floor(now.getTime() / 1000)
      ) {
         return null;
      }
      return { nim: payload.nim, name: payload.name, exp: payload.exp };
   } catch {
      return null;
   }
}

export function readCookie(
   header: string | undefined,
   name: string,
): string | undefined {
   if (!header) return undefined;
   for (const part of header.split(';')) {
      const separator = part.indexOf('=');
      if (separator === -1) continue;
      if (part.slice(0, separator).trim() !== name) continue;
      try {
         return decodeURIComponent(part.slice(separator + 1).trim());
      } catch {
         return undefined;
      }
   }
   return undefined;
}

function cookieOptions(): CookieOptions {
   return {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
   };
}

export function setKitSessionCookie(
   res: Response,
   identity: KitSessionIdentity,
): void {
   res.cookie(KIT_SESSION_COOKIE, createKitSessionToken(identity), {
      ...cookieOptions(),
      maxAge: KIT_SESSION_TTL_SECONDS * 1000,
   });
}

export function clearKitSessionCookie(res: Response): void {
   res.clearCookie(KIT_SESSION_COOKIE, cookieOptions());
}

export function getKitSession(req: Request): KitSessionPayload | null {
   return verifyKitSessionToken(
      readCookie(req.headers.cookie, KIT_SESSION_COOKIE),
   );
}

function rejectUnauthenticated(res: Response) {
   res.set('Cache-Control', 'no-store');
   return res.status(401).json({
      success: false,
      status: 'fail',
      code: 'AUTHENTICATION_REQUIRED',
      message: 'Unauthorized',
      msg: 'Unauthorized',
   });
}

/**
 * Guards the participant-facing kit catalogue. A valid HIMTI Kit session
 * cookie (issued after NIM validation) is enough; admins with a normal
 * session and the `manage_himti_kit` permission also pass so the admin panel
 * can keep listing resources and software.
 */
export const requireKitAccess = (
   req: Request,
   res: Response,
   next: NextFunction,
) => {
   const kitSession = getKitSession(req);
   if (kitSession) {
      res.locals.kitSession = kitSession;
      return next();
   }

   // Only fall back to the admin check when an admin session cookie is
   // present; an anonymous request is a plain 401.
   if (!req.headers.cookie) return rejectUnauthenticated(res);

   return requireAuth(req, res, (error?: unknown) => {
      if (error) return next(error);
      return requirePermission('manage_himti_kit')(req, res, next);
   });
};

export const kitSessionStatus = (req: Request, res: Response) => {
   res.set('Cache-Control', 'no-store');
   const session = getKitSession(req);
   if (!session) return rejectUnauthenticated(res);
   return res.status(200).json({
      success: true,
      data: { nim: session.nim, name: session.name, expiresAt: session.exp * 1000 },
   });
};

export const kitSessionLogout = (_req: Request, res: Response) => {
   res.set('Cache-Control', 'no-store');
   clearKitSessionCookie(res);
   res.status(200).json({ success: true, message: 'Logged out' });
};
