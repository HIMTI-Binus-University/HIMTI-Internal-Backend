import './config/network.js';
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import routes from '@/routes/routes.js';
import { globalErrorHandler } from './middleware/errorMiddleware.js';
import { toNodeHandler } from 'better-auth/node';
import { auth } from './utils/auth.js';
import path from 'path';
import { fileURLToPath } from 'url';
// import limiter from './config/rateLimiter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 8000;

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
         'https://dev-admin.himtibinus.or.id',
         'https://admin.himtibinus.or.id',
         'https://api-tester.himtibinus.or.id',
      ],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: true,
   }),
);
app.use(express.static(path.join(__dirname, '../public')));
app.all('/api/auth/*splat', toNodeHandler(auth));
app.use('/api', routes);
app.use(globalErrorHandler);

app.listen(port, () => {
   console.log(`⚡️[server]: server is running at http://localhost:${port}`);
});
