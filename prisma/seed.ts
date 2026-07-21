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
      ['alam-sutera', 'Alam Sutera'],
      ['bandung', 'Bandung'],
      ['bekasi', 'Bekasi'],
      ['kemanggisan', 'Kemanggisan'],
      ['malang', 'Malang'],
      ['medan', 'Medan'],
      ['senayan', 'Senayan'],
      ['semarang', 'Semarang'],
   ] as const;
   for (const [id, name] of regions) {
      const existing = await prisma.region.findUnique({ where: { name } });
      if (existing) {
         await prisma.region.update({
            where: { id: existing.id },
            data: { id, status: 'ACTIVE' },
         });
      } else {
         await prisma.region.create({ data: { id, name } });
      }
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

   // ==========================================
   // SEED MEMBERSHIP PERIOD
   // ==========================================
   console.log('⏳ Seeding Membership Period...');
   await prisma.$transaction(async (tx) => {
      await tx.membershipPeriod.updateMany({
         where: { isActive: true },
         data: { isActive: false },
      });
      await tx.membershipPeriod.upsert({
         where: { id: '2026-2027' },
         update: { label: '2026/2027', isActive: true },
         create: { id: '2026-2027', label: '2026/2027', isActive: true },
      });
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
