import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { PrismaClient } from '@prisma/client';

// Run only against a disposable migrated database: ALLOW_SEED_CHECK=true node prisma/seed.check.mjs.
assert.equal(process.env.ALLOW_SEED_CHECK, 'true', 'Explicit disposable database approval required');
const prisma = new PrismaClient();
const seed = () => execFileSync('npm', ['run', 'seed'], { stdio: 'inherit' });
try {
   seed();
   const period = await prisma.membershipPeriod.findFirstOrThrow({ where: { isActive: true } });
   const region = await prisma.region.findUniqueOrThrow({ where: { name: 'Alam Sutera' } });
   const before = await prisma.membershipPeriod.findMany({ orderBy: { id: 'asc' } });
   await prisma.region.update({ where: { id: region.id }, data: { status: 'INACTIVE' } });
   seed();
   assert.deepEqual(await prisma.membershipPeriod.findMany({ orderBy: { id: 'asc' } }), before);
   assert.equal((await prisma.region.findUniqueOrThrow({ where: { id: region.id } })).status, 'INACTIVE');
   assert.equal(await prisma.role.count({ where: { roleName: 'Admin' } }), 1);
   assert.equal(await prisma.user.count({ where: { email: 'system@himti.internal' } }), 1);
   assert.equal((await prisma.membershipPeriod.findUniqueOrThrow({ where: { id: period.id } })).isActive, true);
   console.log('Seed preserves membership and region state on repeat');
} finally {
   await prisma.$disconnect();
}
