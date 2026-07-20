import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
   console.log('🌱 Memulai proses database seeding...');

   // ==========================================
   // SEED UNIVERSITY
   // ==========================================
   console.log('⏳ Seeding University...');
   await prisma.university.upsert({
      where: { name: 'BINUS University' },
      update: {},
      create: {
         name: 'BINUS University',
         shortName: 'BINUS',
      },
   });

   // ==========================================
   // SEED STUDY PROGRAMS
   // ==========================================
   console.log('⏳ Seeding Study Programs...');
   const studyPrograms = [
      { name: 'Computer Science Reguler', shortName: 'CS Reguler' },
      { name: 'Computer Science Global', shortName: 'CS Global' },
   ];
   for (const sp of studyPrograms) {
      await prisma.studyProgram.upsert({
         where: { name: sp.name },
         update: {},
         create: { name: sp.name, shortName: sp.shortName },
      });
   }

   // ==========================================
   // SEED BINUS REGIONS
   // ==========================================
   console.log('⏳ Seeding BINUS Regions...');
   const binusRegions = [
      'Kemanggisan',
      'Alam Sutera',
      'Semarang',
      'Malang',
      'Bekasi',
      'Medan',
      'Bandung',
   ];
   for (const name of binusRegions) {
      await prisma.binusRegion.upsert({
         where: { name },
         update: {
            status: 'ACTIVE',
         },
         create: {
            name,
            status: 'ACTIVE',
         },
      });
   }

   // ==========================================
   // SEED SYSTEM USER (for createdBy references)
   // ==========================================
   console.log('⏳ Seeding System User...');
   const systemUser = await prisma.user.upsert({
      where: { email: 'system@himti.internal' },
      update: {},
      create: {
         name: 'System',
         email: 'system@himti.internal',
         emailVerified: true,
         status: 'ACTIVE',
      },
   });

   // ==========================================
   // SEED PERMISSIONS
   // ==========================================
   console.log('⏳ Seeding Permissions...');
   const permissionNames = [
      'manage_urls',
      'manage_permissions',
      'manage_users',
      'manage_roles',
   ];

   const permissions: Record<string, { id: string }> = {};
   for (const name of permissionNames) {
      const perm = await prisma.permission.upsert({
         where: { name },
         update: {},
         create: {
            name,
            creator: { connect: { id: systemUser.id } },
         },
      });
      permissions[name] = perm;
   }

   // ==========================================
   // SEED ROLES & ASSIGN PERMISSIONS
   // ==========================================
   console.log('⏳ Seeding Roles and Assigning Permissions...');
   const roleNames = ['General Manager', 'Manager', 'DPI Umum', 'DPI', 'Admin'];

   for (const roleName of roleNames) {
      const role = await prisma.role.upsert({
         where: { roleName },
         update: {},
         create: {
            roleName,
            creator: { connect: { id: systemUser.id } },
         },
      });

      // Assign all permissions to each role
      for (const perm of Object.values(permissions)) {
         await prisma.roleHasPermission.upsert({
            where: {
               roleId_permissionId: {
                  roleId: role.id,
                  permissionId: perm.id,
               },
            },
            update: {},
            create: {
               roleId: role.id,
               permissionId: perm.id,
            },
         });
      }
   }

   // ==========================================
   // SEED NORMAL MEMBER ROLE
   // ==========================================
   console.log('⏳ Seeding Member Role...');
   await prisma.role.upsert({
      where: { roleName: 'Member' },
      update: {
         status: 'ACTIVE',
      },
      create: {
         roleName: 'Member',
         status: 'ACTIVE',
         creator: { connect: { id: systemUser.id } },
      },
   });

   console.log('✅ Seeding berhasil diselesaikan!');
}

main()
   .catch((e) => {
      console.error('❌ Terjadi kesalahan saat seeding:', e);
      process.exit(1);
   })
   .finally(async () => {
      await prisma.$disconnect();
   });
