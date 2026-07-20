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
      { name: 'Artificial Intelligence', shortName: 'AI' },
      { name: 'Computer Science - Global Class', shortName: 'CS Global' },
      { name: 'Computer Science - Regular Class', shortName: 'CS Regular' },
      { name: 'Computer Science - Master Track', shortName: 'CS Master' },
      {
         name: 'Computer Science - Software Engineering',
         shortName: 'CS Software Engineering',
      },
      { name: 'Cyber Security', shortName: 'Cyber Security' },
      { name: 'Data Science', shortName: 'Data Science' },
      { name: 'Digital Psychology', shortName: 'Digital Psychology' },
      {
         name: 'Game Application and Technology',
         shortName: 'GAT',
      },
   ];
   for (const sp of studyPrograms) {
      await prisma.studyProgram.upsert({
         where: { name: sp.name },
         update: {},
         create: { name: sp.name, shortName: sp.shortName },
      });
   }

   // ==========================================
   // SEED REGIONS
   // ==========================================
   console.log('⏳ Seeding Regions...');
   const regions = [
      'Alam Sutera',
      'Bandung',
      'Bekasi',
      'Kemanggisan',
      'Malang',
      'Medan',
      'Senayan',
      'Semarang',
   ];
   for (const name of regions) {
      await prisma.region.upsert({
         where: { name },
         update: {},
         create: { name },
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
      'manage_events',
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
