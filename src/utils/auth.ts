import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { createAuthEndpoint, APIError } from 'better-auth/api';
import { setSessionCookie } from 'better-auth/cookies';
import { customSession } from 'better-auth/plugins';
import { prisma } from '@/config/prisma.js';
import { trustedOrigins } from '@/config/origins.js';
export const devAutoLoginEnabled = process.env.ENABLE_DEV_AUTO_LOGIN === 'true';
if (devAutoLoginEnabled && process.env.NODE_ENV !== 'development') {
   throw new Error('ENABLE_DEV_AUTO_LOGIN requires NODE_ENV=development');
}

const devLoginPlugin = {
   id: 'local-dev-login',
   endpoints: {
      devLoginAvailability: createAuthEndpoint('/dev-login', { method: 'GET' }, async () => ({
         enabled: devAutoLoginEnabled,
      })),
      devLogin: createAuthEndpoint('/dev-login', { method: 'POST' }, async (ctx) => {
         if (!devAutoLoginEnabled) throw new APIError('FORBIDDEN');
         const user = await prisma.user.findUnique({
            where: { email: 'system@himti.internal' },
            include: { userHasRoles: { where: { role: { roleName: 'Admin', status: 'ACTIVE' } } } },
         });
         if (!user || user.status !== 'ACTIVE' || !user.registrationCompletedAt || !user.userHasRoles.length) {
            throw new APIError('SERVICE_UNAVAILABLE', { message: 'Seed the System administrator first' });
         }
         const session = await ctx.context.internalAdapter.createSession(user.id);
         if (!session) throw new APIError('INTERNAL_SERVER_ERROR');
         await setSessionCookie(ctx, { session, user: { ...user, updatedAt: user.updatedAt ?? user.createdAt } });
         return { success: true };
      }),
   },
};

export const auth = betterAuth({
   database: prismaAdapter(prisma, {
      provider: 'postgresql',
   }),

   socialProviders: {
      google: {
         clientId: process.env.GOOGLE_CLIENT_ID!,
         clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
         accessType: 'offline',

         prompt: 'select_account',
      },
   },

   session: {
      updateAge: 60 * 60 * 24,
   },

   trustedOrigins,

   plugins: [
      devLoginPlugin,
      customSession(async ({ user, session }) => {
         const [currentUser, userRoles] = await Promise.all([
            // Authorization must use current status, never the cached session user.
            prisma.user.findUnique({
               where: { id: user.id },
               select: { status: true },
            }),
            prisma.userHasRole.findMany({
               where: {
                  userId: user.id,
                  role: {
                     status: 'ACTIVE',
                  },
               },
               include: { role: true },
            }),
         ]);

         const roles = userRoles.map((r) => r.role.roleName);

         return {
            user: {
               ...user,
               status: currentUser?.status ?? 'INACTIVE',
               roles, // string[] — e.g. ["admin", "member"]
            },
            session,
         };
      }),
   ],

   user: {
      additionalFields: {
         role: {
            type: 'string',
            required: false,
         },
         status: {
            type: 'string',
            required: false,
            input: false,
            defaultValue: 'ACTIVE',
         },
      },
   },
});
