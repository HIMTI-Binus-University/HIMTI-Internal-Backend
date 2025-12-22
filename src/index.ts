import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import routes from '@/routes/routes.js';
import { clickUrl } from './features/url-shortener/urlController.js';

const app = express();
const port = process.env.port || 8000;

// app.use(limiter);
app.use(express.json());
app.use(cors());
app.use('/api', routes);
app.get('/:shortCode', clickUrl);

app.listen(port, () => {
   console.log(`⚡️[server]: server is running at http://localhost:${port}`);
});
