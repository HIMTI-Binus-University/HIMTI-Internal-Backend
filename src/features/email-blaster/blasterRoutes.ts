import express from 'express';
import type { Router, Response, Request } from 'express';

const router: Router = express.Router();

router.get('/blasttest', (req: Request, res: Response) => {
   res.json({ message: 'test blast oi' });
});

export default router;
