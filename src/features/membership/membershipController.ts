import type { Request, Response } from 'express';
import { membershipService } from './membershipService.js';

export const getMembershipResources = async (_req: Request, res: Response) => {
   const result = await membershipService.getMembershipResources(
      res.locals.user.id,
   );

   res.json({ msg: 'success', data: result });
};
