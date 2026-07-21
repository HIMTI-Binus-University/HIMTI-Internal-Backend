import './config/network.js';
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import docsRoutes from '@/docs/docsRoutes.js';
import routes from '@/routes/routes.js';
import { requireAuth } from '@/middleware/authMiddleware.js';
import { requirePermission } from '@/middleware/permissionMiddleware.js';
import { globalErrorHandler } from './middleware/errorMiddleware.js';
import { toNodeHandler } from 'better-auth/node';
import { auth } from './utils/auth.js';
import path from 'path';
import { fileURLToPath } from 'url';
import limiter from './config/rateLimiter.js';
import { trustedOrigins } from './config/origins.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 8000;
const shouldEnableApiDocs = process.env.ENABLE_API_DOCS === 'true';

app.use(limiter);
app.use(express.json());
app.use(
   cors({
      origin: trustedOrigins,
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: true,
   }),
);
app.use(express.static(path.join(__dirname, '../public')));
app.all('/api/auth/*splat', toNodeHandler(auth));
if (shouldEnableApiDocs) {
   app.use(
      '/api',
      requireAuth,
      requirePermission('manage_permissions'),
      docsRoutes,
   );
}
app.use('/api', routes);
app.use(globalErrorHandler);

app.listen(port, () => {
   console.log(`⚡️[server]: server is running at http://localhost:${port}`);
});
