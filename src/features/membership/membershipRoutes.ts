import express, { Request, Response } from 'express';
import { prisma } from '@/config/prisma.js';
import { requireAuth } from '@/middleware/authMiddleware.js';
import { AppError } from '@/utils/appError.js';

const router = express.Router();

router.get('/resources', requireAuth, async (_req: Request, res: Response) => {
   const user = await prisma.user.findUnique({
      where: { id: res.locals.user.id },
      select: {
         registrationCompletedAt: true,
         graduateBatch: true,
         regionId: true,
      },
   });

   if (!user?.registrationCompletedAt) {
      throw new AppError('registration_required', 403);
   }

   const period = await prisma.membershipPeriod.findFirst({
      where: { isActive: true },
      orderBy: { id: 'asc' },
      select: { id: true, label: true },
   });

   if (!period) {
      throw new AppError('active_membership_period_not_found', 404);
   }

   const [groups, contacts] = await Promise.all([
      prisma.membershipGroup.findMany({
         where: {
            periodId: period.id,
            AND: [
               {
                  OR: [
                     { graduateBatch: null },
                     { graduateBatch: user.graduateBatch },
                  ],
               },
               { OR: [{ regionId: null }, { regionId: user.regionId }] },
            ],
         },
         select: { id: true, title: true, url: true },
         orderBy: [{ title: 'asc' }, { id: 'asc' }],
      }),
      prisma.membershipContact.findMany({
         where: { periodId: period.id },
         select: {
            id: true,
            areas: true,
            name: true,
            phoneNumber: true,
            contactUrl: true,
         },
         orderBy: [{ name: 'asc' }, { id: 'asc' }],
      }),
   ]);

   res.json({ msg: 'success', data: { period, groups, contacts } });
});

export default router;
