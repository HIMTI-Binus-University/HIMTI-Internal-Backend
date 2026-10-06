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
      await prisma.region.upsert({
         where: { name },
         update: {},
         create: { id, name },
      });
   }

   // ==========================================
   // SEED SYSTEM USER (for createdBy references)
   // ==========================================
   console.log('⏳ Seeding System User...');
   const systemUser = await prisma.user.upsert({
      where: { email: 'system@himti.internal' },
      update: {
         status: 'ACTIVE',
         registrationCompletedAt: new Date(),
         institutionType: 'NON_BINUS',
      },
      create: {
         name: 'System',
         email: 'system@himti.internal',
         emailVerified: true,
         status: 'ACTIVE',
         registrationCompletedAt: new Date(),
         institutionType: 'NON_BINUS',
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
      'manage_event_groups',
      'manage_event_registration',
      'manage_event_packages',
      'manage_event_registration_form',
      'manage_batch',
      'review_event_registrations',
      'view_event_answers',
      'review_event_payments',
      'view_payment_proofs',
      'scan_event_tickets',
      'view_event_attendance',
      'correct_event_attendance',
      'manage_elections',
      'manage_certificates',
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
   // Administrators attest SoCS membership; these roles grant no management permissions.
   for (const roleName of ['SoCS Student', 'SoCS Lecturer']) {
      await prisma.role.upsert({
         where: { roleName }, update: {},
         create: { roleName, creator: { connect: { id: systemUser.id } } },
      });
   }
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

      // Batch and election administration are restricted to administrators.
      for (const perm of Object.values(permissions)) {
         if (
            [
               permissions.manage_batch.id,
               permissions.review_event_registrations.id,
               permissions.view_event_answers.id,
               permissions.review_event_payments.id,
               permissions.view_payment_proofs.id,
               permissions.scan_event_tickets.id,
               permissions.view_event_attendance.id,
               permissions.correct_event_attendance.id,
               permissions.manage_elections.id,
            ].includes(perm.id) &&
            roleName !== 'Admin'
         ) {
            continue;
         }
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

   const adminRole = await prisma.role.findUniqueOrThrow({
      where: { roleName: 'Admin' },
   });
   if (adminRole.status !== 'ACTIVE') {
      await prisma.role.update({
         where: { id: adminRole.id },
         data: { status: 'ACTIVE' },
      });
   }
   await prisma.userHasRole.upsert({
      where: { userId_roleId: { userId: systemUser.id, roleId: adminRole.id } },
      update: {},
      create: { userId: systemUser.id, roleId: adminRole.id },
   });

   // ==========================================
   // SEED MEMBERSHIP PERIOD
   // ==========================================
   console.log('⏳ Seeding Membership Period...');
   await prisma.$transaction(async (tx) => {
      const activePeriod = await tx.membershipPeriod.findFirst({
         where: { isActive: true },
      });
      await tx.membershipPeriod.upsert({
         where: { id: '2026-2027' },
         update: {},
         create: {
            id: '2026-2027',
            label: '2026/2027',
            isActive: !activePeriod,
         },
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
