import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { PrismaClient } from '@prisma/client';
import { customSession } from 'better-auth/plugins';

const prisma = new PrismaClient();

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

   trustedOrigins: [
      'http://localhost:3000',
      'http://localhost:8000',
      'https://dev-admin.himtibinus.or.id',
      'https://admin.himtibinus.or.id',
      'https://api-tester.himtibinus.or.id/',
   ],

   plugins: [
      customSession(async ({ user, session }) => {
         const userRoles = await prisma.userHasRole.findMany({
            where: { userId: user.id },
            include: { role: true },
         });

         const roles = userRoles.map((r) => r.role.roleName);

         return {
            user: {
               ...user,
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
