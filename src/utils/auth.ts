import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const auth = betterAuth({
   database: prismaAdapter(prisma, {
      provider: 'postgresql',
   }),

   cookies: {
      sessionToken: {
         options: {
            httpOnly: true,
            sameSite: 'none',
            secure: true,
         },
      },
   },

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
      'http://localhost:3000', // URL Frontend kamu
      'http://localhost:8000',
      'http://72.62.122.54.nip.io:8001',
   ],

   user: {
      additionalFields: {
         roleId: {
            type: 'string',
            required: false,
         },
         status: {
            type: 'string',
            required: false,
            defaultValue: 'a',
         },
      },
   },

   // Validation ntar dlu
   hooks: {},
});
