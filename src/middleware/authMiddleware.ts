import { Request, Response, NextFunction } from 'express';
import { auth } from '@/utils/auth.js';
import { fromNodeHeaders } from 'better-auth/node';

export const requireAuth = async (
   req: Request,
   res: Response,
   next: NextFunction,
) => {
   const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
   });

   if (!session) {
      return res.status(401).json({ msg: 'Unauthorized' });
   }

   if (session.user.status !== 'ACTIVE') {
      return res.status(403).json({ msg: 'Account is not active' });
   }

   res.locals.user = session.user;
   res.locals.session = session.session;

   next();
};

declare global {
   // eslint-disable-next-line @typescript-eslint/no-namespace
   namespace Express {
      interface Locals {
         user: typeof auth.$Infer.Session.user;
         session: typeof auth.$Infer.Session.session;
      }
   }
}
