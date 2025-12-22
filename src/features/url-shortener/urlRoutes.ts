import express from 'express';
import type { Router, Response, Request } from 'express';
import { createUrl, getUrls, updateUrl } from './urlController.js';

const router: Router = express.Router();

router.get('/urltest', (_req: Request, res: Response) => {
   res.json({ message: 'test oi' });
});

router.post('/create-url', createUrl);
router.put('/update-url/:id', updateUrl);
router.get('/list', getUrls);

export default router;
