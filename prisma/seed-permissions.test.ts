import assert from 'node:assert/strict';
import test from 'node:test';
import type { PrismaClient } from '@prisma/client';
import {
   ADMIN_ONLY_PERMISSIONS,
   PERMISSION_NAMES,
   ROLE_NAMES,
   defaultRolesFor,
   syncPermissionsAndRoles,
} from './seedPermissions.js';

// Minimal in-memory stand-in for the Prisma calls the sync uses.
function createFakePrisma(initial?: {
   permissions?: string[];
   grants?: Array<[role: string, permission: string]>;
}) {
   let nextId = 1;
   const permissions = new Map<string, { id: string; name: string }>();
   const roles = new Map<
      string,
      { id: string; roleName: string; status: string }
   >();
   const grants = new Set<string>();
   const grantKey = (roleId: string, permissionId: string) =>
      `${roleId}:${permissionId}`;

   const ensureRole = (roleName: string) => {
      let role = roles.get(roleName);
      if (!role) {
         role = { id: `r${nextId++}`, roleName, status: 'ACTIVE' };
         roles.set(roleName, role);
      }
      return role;
   };
   for (const name of initial?.permissions ?? []) {
      permissions.set(name, { id: `p${nextId++}`, name });
   }
   for (const [roleName, permissionName] of initial?.grants ?? []) {
      grants.add(
         grantKey(ensureRole(roleName).id, permissions.get(permissionName)!.id),
      );
   }

   const prisma = {
      permission: {
         findUnique: async ({ where }: { where: { name: string } }) =>
            permissions.get(where.name) ?? null,
         upsert: async ({ where }: { where: { name: string } }) => {
            let permission = permissions.get(where.name);
            if (!permission) {
               permission = { id: `p${nextId++}`, name: where.name };
               permissions.set(where.name, permission);
            }
            return permission;
         },
      },
      role: {
         upsert: async ({ where }: { where: { roleName: string } }) =>
            ensureRole(where.roleName),
         findUniqueOrThrow: async ({ where }: { where: { roleName: string } }) =>
            roles.get(where.roleName)!,
         update: async ({
            where,
            data,
         }: {
            where: { id: string };
            data: { status: string };
         }) => {
            const role = [...roles.values()].find((r) => r.id === where.id)!;
            role.status = data.status;
            return role;
         },
      },
      roleHasPermission: {
         upsert: async ({
            where,
         }: {
            where: { roleId_permissionId: { roleId: string; permissionId: string } };
         }) => {
            const { roleId, permissionId } = where.roleId_permissionId;
            grants.add(grantKey(roleId, permissionId));
            return {};
         },
      },
      userHasRole: { upsert: async () => ({}) },
   };

   const has = (roleName: string, permissionName: string) =>
      grants.has(
         grantKey(roles.get(roleName)!.id, permissions.get(permissionName)!.id),
      );

   return { prisma: prisma as unknown as PrismaClient, permissions, has };
}

test('HIMTI Kit and certificate permissions are part of the seeded set', () => {
   assert.ok(PERMISSION_NAMES.includes('manage_himti_kit'));
   assert.ok(PERMISSION_NAMES.includes('manage_certificates'));
   assert.equal(new Set(PERMISSION_NAMES).size, PERMISSION_NAMES.length);
});

test('admin-only permissions default to the Admin role alone', () => {
   for (const name of ADMIN_ONLY_PERMISSIONS) {
      assert.deepEqual(defaultRolesFor(name), ['Admin']);
   }
   assert.deepEqual(defaultRolesFor('manage_himti_kit'), [...ROLE_NAMES]);
});

test('a fresh database gets every permission and the default grants', async () => {
   const db = createFakePrisma();
   const { created } = await syncPermissionsAndRoles(db.prisma, 'system', {
      grantDefaultsOnlyToNewPermissions: true,
   });

   assert.equal(created.length, PERMISSION_NAMES.length);
   for (const name of PERMISSION_NAMES) assert.ok(db.has('Admin', name), name);
   assert.ok(db.has('Manager', 'manage_himti_kit'));
   assert.ok(db.has('Manager', 'manage_certificates'));
   assert.equal(db.has('Manager', 'manage_batch'), false);
});

test('deploy mode backfills a missing permission without undoing RBAC edits', async () => {
   // Existing deployment: every permission except manage_himti_kit exists, and
   // someone deliberately removed manage_certificates from Manager.
   const existing = PERMISSION_NAMES.filter((n) => n !== 'manage_himti_kit');
   const db = createFakePrisma({
      permissions: [...existing],
      grants: [
         ['Admin', 'manage_urls'],
         ['Manager', 'manage_urls'],
      ],
   });

   const { created } = await syncPermissionsAndRoles(db.prisma, 'system', {
      grantDefaultsOnlyToNewPermissions: true,
   });

   assert.deepEqual(created, ['manage_himti_kit']);
   // New permission reaches its default roles.
   for (const role of ROLE_NAMES) assert.ok(db.has(role, 'manage_himti_kit'), role);
   // Admin always holds everything, even permissions that already existed.
   for (const name of PERMISSION_NAMES) assert.ok(db.has('Admin', name), name);
   // Non-admin roles are not re-granted permissions that already existed.
   assert.equal(db.has('Manager', 'manage_certificates'), false);
   assert.ok(db.has('Manager', 'manage_urls'));
});

test('a second deploy run changes nothing', async () => {
   const db = createFakePrisma();
   await syncPermissionsAndRoles(db.prisma, 'system', {
      grantDefaultsOnlyToNewPermissions: true,
   });
   const { created } = await syncPermissionsAndRoles(db.prisma, 'system', {
      grantDefaultsOnlyToNewPermissions: true,
   });
   assert.deepEqual(created, []);
});

test('full seed mode still re-applies every default grant', async () => {
   const db = createFakePrisma({
      permissions: [...PERMISSION_NAMES],
      grants: [['Admin', 'manage_urls']],
   });
   await syncPermissionsAndRoles(db.prisma, 'system');
   assert.ok(db.has('Manager', 'manage_certificates'));
   assert.ok(db.has('DPI', 'manage_himti_kit'));
});
