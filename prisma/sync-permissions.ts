import { PrismaClient } from '@prisma/client';
import { ensureSystemUser, syncPermissionsAndRoles } from './seedPermissions.js';

// Lightweight, idempotent sync run on every deploy (after `prisma migrate
// deploy`) so new permissions exist and the Admin role holds all of them.
// It does not touch courses, regions or any other seed data.
const prisma = new PrismaClient();

async function main() {
   const systemUser = await ensureSystemUser(prisma);
   const { created } = await syncPermissionsAndRoles(prisma, systemUser.id, {
      grantDefaultsOnlyToNewPermissions: true,
   });
   console.log(
      created.length
         ? `✅ Permissions synced. Created: ${created.join(', ')}`
         : '✅ Permissions synced. Nothing new.',
   );
}

main()
   .catch((error) => {
      console.error('❌ Permission sync failed:', error);
      process.exit(1);
   })
   .finally(() => prisma.$disconnect());
