import type { PrismaClient } from '@prisma/client';

export const SYSTEM_USER_EMAIL = 'system@himti.internal';

export const PERMISSION_NAMES = [
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
   'manage_education',
   'create_education_summary',
   'edit_education_summary',
   'review_education_summary',
   'publish_education_summary',
   'archive_education_summary',
   'manage_himti_kit',
] as const;

export const ROLE_NAMES = [
   'General Manager',
   'Manager',
   'DPI Umum',
   'DPI',
   'Admin',
] as const;

// Batch, election and event-review permissions are restricted to administrators.
export const ADMIN_ONLY_PERMISSIONS: ReadonlySet<string> = new Set([
   'manage_batch',
   'review_event_registrations',
   'view_event_answers',
   'review_event_payments',
   'view_payment_proofs',
   'scan_event_tickets',
   'view_event_attendance',
   'correct_event_attendance',
   'manage_elections',
   'create_education_summary',
   'edit_education_summary',
   'review_education_summary',
   'publish_education_summary',
   'archive_education_summary',
]);

export function defaultRolesFor(permissionName: string): string[] {
   return ROLE_NAMES.filter(
      (roleName) =>
         roleName === 'Admin' || !ADMIN_ONLY_PERMISSIONS.has(permissionName),
   );
}

export async function ensureSystemUser(prisma: PrismaClient) {
   return prisma.user.upsert({
      where: { email: SYSTEM_USER_EMAIL },
      update: {
         status: 'ACTIVE',
         registrationCompletedAt: new Date(),
         institutionType: 'NON_BINUS',
      },
      create: {
         name: 'System',
         email: SYSTEM_USER_EMAIL,
         emailVerified: true,
         status: 'ACTIVE',
         registrationCompletedAt: new Date(),
         institutionType: 'NON_BINUS',
      },
   });
}

export interface SyncPermissionsOptions {
   /**
    * Deploy mode. Other roles only receive a permission when it is created by
    * this run, so permission changes made later in the RBAC admin UI are not
    * re-granted on every deploy. The Admin role always holds every permission.
    * When false (full seed) every default grant is upserted, as before.
    */
   grantDefaultsOnlyToNewPermissions?: boolean;
}

export async function syncPermissionsAndRoles(
   prisma: PrismaClient,
   systemUserId: string,
   options: SyncPermissionsOptions = {},
) {
   const onlyNew = options.grantDefaultsOnlyToNewPermissions ?? false;

   const permissions: Record<string, { id: string }> = {};
   const created = new Set<string>();
   for (const name of PERMISSION_NAMES) {
      const existing = await prisma.permission.findUnique({ where: { name } });
      if (!existing) created.add(name);
      permissions[name] = await prisma.permission.upsert({
         where: { name },
         update: {},
         create: { name, creator: { connect: { id: systemUserId } } },
      });
   }

   // Administrators attest SoCS membership; these roles grant no management permissions.
   for (const roleName of ['SoCS Student', 'SoCS Lecturer']) {
      await prisma.role.upsert({
         where: { roleName },
         update: {},
         create: { roleName, creator: { connect: { id: systemUserId } } },
      });
   }

   for (const roleName of ROLE_NAMES) {
      const role = await prisma.role.upsert({
         where: { roleName },
         update: {},
         create: { roleName, creator: { connect: { id: systemUserId } } },
      });

      for (const name of PERMISSION_NAMES) {
         if (!defaultRolesFor(name).includes(roleName)) continue;
         if (onlyNew && roleName !== 'Admin' && !created.has(name)) continue;
         await prisma.roleHasPermission.upsert({
            where: {
               roleId_permissionId: {
                  roleId: role.id,
                  permissionId: permissions[name].id,
               },
            },
            update: {},
            create: { roleId: role.id, permissionId: permissions[name].id },
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
      where: {
         userId_roleId: { userId: systemUserId, roleId: adminRole.id },
      },
      update: {},
      create: { userId: systemUserId, roleId: adminRole.id },
   });

   return { permissions, created: [...created] };
}
