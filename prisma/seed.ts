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
         create: {
            name: sp.name,
            shortName: sp.shortName,
         },
      });
   }

   // ==========================================
   // SEED PERMISSIONS
   // ==========================================
   console.log('⏳ Seeding Permissions...');
   const manageUrlsPerm = await prisma.permission.upsert({
      where: { name: 'manage_urls' },
      update: {},
      create: { name: 'manage_urls' },
   });

   // ==========================================
   // 4. SEED ROLES
   // ==========================================
   console.log('⏳ Seeding Roles and Assigning Permissions...');
   const roles = ['General Manager', 'Manager', 'DPI Umum', 'DPI'];

   for (const roleName of roles) {
      // Buat atau cari Role
      const roleRecord = await prisma.role.upsert({
         where: { roleName: roleName },
         update: {},
         create: { roleName: roleName },
      });

      // Assign permission 'manage_urls' ke Role ini
      await prisma.roleHasPermission.upsert({
         where: {
            roleId_permissionId: {
               roleId: roleRecord.id,
               permissionId: manageUrlsPerm.id,
            },
         },
         update: {},
         create: {
            roleId: roleRecord.id,
            permissionId: manageUrlsPerm.id,
         },
      });
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
