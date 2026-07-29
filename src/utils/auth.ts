import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { customSession } from 'better-auth/plugins';
import { prisma } from '@/config/prisma.js';
import { trustedOrigins } from '@/config/origins.js';

export const auth = betterAuth({
   database: prismaAdapter(prisma, {
      provider: 'postgresql',
   }),

   socialProviders: {
      google: {
         clientId: process.env.GOOGLE_CLIENT_ID!,
         clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
         accessType: 'offline',

         // ntar di prod gausah
         prompt: 'consent',
      },
   },

   session: {
      updateAge: 60 * 60 * 24,
   },

   trustedOrigins,

   plugins: [
      customSession(async ({ user, session }) => {
         const [currentUser, userRoles] = await Promise.all([
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
            defaultValue: 'ACTIVE',
         },
      },
   },
});
