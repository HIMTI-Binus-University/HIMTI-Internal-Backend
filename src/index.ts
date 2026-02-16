import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import routes from '@/routes/routes.js';
import { clickUrl } from './features/url-shortener/urlController.js';
import { globalErrorHandler } from './utils/errorMiddleware.js';
import { toNodeHandler } from 'better-auth/node';
import { auth } from './utils/auth.js';
import path from 'path';
import { fileURLToPath } from 'url';
// import limiter from './config/rateLimiter.js';
import crypto from 'crypto'; // Built-in Node module for generating session tokens
import { PrismaClient } from '@prisma/client';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 8000;
const prisma = new PrismaClient();

// app.use(limiter);
app.use(express.json());
app.use(
   cors({
      origin: [
         'http://localhost:3000',
         'http://localhost:8000',
         'https://link.himtibinus.or.id',
         'https://dev-link.himtibinus.or.id',
         'https://api.himtibinus.or.id',
         'https://dev-api.himtibinus.or.id',
      ],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: true,
   }),
);
app.use(express.static(path.join(__dirname, '../public')));

// =========================================================================
// 🚧 LOAD TESTING BACKDOOR (DEV ONLY) 🚧
// This simulates a Google OAuth Callback -> DB Write
// =========================================================================
if (process.env.NODE_ENV !== 'production') {
   console.log('⚠️  Load Testing Routes Enabled');

   app.post('/api/test/mock-oauth', async (req, res) => {
      const { email, name, googleId } = req.body;

      if (!email || !name || !googleId) {
         return res
            .status(400)
            .json({ error: 'Missing email, name, or googleId' });
      }

      try {
         // Using a transaction to simulate the exact load of a real login:
         // 1. Create User
         // 2. Link Google Account
         // 3. Create Session
         const result = await prisma.$transaction(async (tx) => {
            // 1. Create the User
            const user = await tx.user.create({
               data: {
                  name: name,
                  email: email,
                  emailVerified: true, // Google accounts are always verified
                  image: `https://lh3.googleusercontent.com/a/${googleId}`, // Fake Google Image URL
                  status: 'ACTIVE',

                  // 2. Create the Account (Link to Google)
                  accounts: {
                     create: {
                        providerId: 'google',
                        accountId: googleId, // The Fake Google ID
                        accessToken:
                           'mock_access_token_' +
                           crypto.randomBytes(16).toString('hex'),
                        refreshToken:
                           'mock_refresh_token_' +
                           crypto.randomBytes(16).toString('hex'),
                     },
                  },

                  // 3. Create the Session (The "Login" part)
                  sessions: {
                     create: {
                        token: crypto.randomBytes(32).toString('hex'), // Random session token
                        expiresAt: new Date(
                           Date.now() + 7 * 24 * 60 * 60 * 1000,
                        ), // 1 week
                        ipAddress: req.ip,
                        userAgent: req.headers['user-agent'] || 'k6-load-test',
                     },
                  },
               },
               include: {
                  sessions: true, // Return session so we can see it worked
               },
            });

            return user;
         });

         // Return success
         return res.status(201).json({
            success: true,
            userId: result.id,
            sessionToken: result.sessions[0].token,
         });
      } catch (error: any) {
         // Handle Unique Constraint Violations (if k6 sends duplicate emails)
         if (error.code === 'P2002') {
            return res.status(409).json({ error: 'User already exists' });
         }
         console.error('Mock Login Error:', error);
         return res.status(500).json({ error: 'Database transaction failed' });
      }
   });
}
// =========================================================================

app.all('/api/auth/*splat', toNodeHandler(auth));
app.use('/api', routes);
app.get('/:shortCode', clickUrl);
app.use(globalErrorHandler);

app.listen(port, () => {
   console.log(`⚡️[server]: server is running at http://localhost:${port}`);
});
