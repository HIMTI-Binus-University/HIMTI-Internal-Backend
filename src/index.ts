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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 8000;

// app.use(limiter);
app.use(express.json());
app.use(
   cors({
      origin: [
         'http://72.62.122.54:8001', // IP VPS (Akses html testing via IP)
         'http://72.62.122.54.nip.io:8001', // Domain nip.io (Akses Frontend via Domain)
         'http://localhost:3000',
         'http://localhost:8000',
         'http://72.62.122.54:3000',
         'http://72.62.122.54.nip.io:3000',
      ],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: true,
   }),
);
app.use(express.static(path.join(__dirname, '../public')));
app.all('/api/auth/*splat', toNodeHandler(auth));
app.use('/api', routes);
app.get('/:shortCode', clickUrl);
app.use(globalErrorHandler);

app.listen(port, () => {
   console.log(`⚡️[server]: server is running at http://localhost:${port}`);
});
