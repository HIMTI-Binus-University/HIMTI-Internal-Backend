import express from 'express';
import type { Router, Request, Response } from 'express';
import { apiReference } from '@scalar/express-api-reference';
import { generateOpenApiDocument } from './openapi.js';
import { requireAuth } from '@/middleware/authMiddleware.js';

const router: Router = express.Router();

router.get('/openapi.json', requireAuth, (_req: Request, res: Response) => {
   res.json(generateOpenApiDocument());
});

router.use(
   '/docs',
   requireAuth,
   apiReference({
      url: '/api/openapi.json',
      pageTitle: 'HIMTI Internal Tools API',
      proxyUrl: '',
      customFetch: (input, init) =>
         fetch(input, {
            ...init,
            credentials: 'include',
         }),
   }),
);

export default router;
