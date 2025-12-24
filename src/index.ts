import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import routes from '@/routes/routes.js';
import { clickUrl } from './features/url-shortener/urlController.js';
import { globalErrorHandler } from './utils/errorMiddleware.js';
import { toNodeHandler } from 'better-auth/node';
import { auth } from './utils/auth.js';

const app = express();
const port = process.env.port || 8000;

// app.use(limiter);
app.use(express.json());
app.use(
   cors({
      origin: 'http://localhost:3000',
      credentials: true,
   }),
);
// app.all('/api/auth', toNodeHandler(auth));
app.all(/\/api\/auth\/*/, toNodeHandler(auth));
app.use('/api', routes);
app.get('/:shortCode', clickUrl);
app.use(globalErrorHandler);

app.listen(port, () => {
   console.log(`⚡️[server]: server is running at http://localhost:${port}`);
});
