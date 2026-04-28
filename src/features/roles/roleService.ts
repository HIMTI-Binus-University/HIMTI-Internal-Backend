import { Prisma } from '@prisma/client';
import { auth } from '@/utils/auth.js';
import { roleRepository } from './roleRepository.js';
import type {
   AssignPermissionToRoleRequest,
   AssignRoleToUserRequest,
   CreateRoleRequest,
   GetRoleQuery,
   GetRoleResponse,
   RemovePermissionFromRoleRequest,
   RemoveRoleFromUserRequest,
   UpdateRoleRequest,
} from './roleTypes.js';

class RoleService {
   async getRoles(params: GetRoleQuery): Promise<GetRoleResponse> {
      const { data, total } = await roleRepository.findAll(params);

      return {
         data: data.map(({ roleHasPermissions, ...role }) => ({
            ...role,
            permissions: roleHasPermissions.map((rhp) => rhp.permission),
         })),
         meta: {
            page: params.page,
            limit: params.limit,
            totalRecords: total,
            totalPages: Math.ceil(total / params.limit),
         },
      };
   }

   async getRoleById(id: string) {
      const role = await roleRepository.findById(id);
      if (!role) return null;

      const { roleHasPermissions, ...rest } = role;
      return {
         ...rest,
         permissions: roleHasPermissions.map((rhp) => rhp.permission),
      };
   }

   async createRole(
      payload: CreateRoleRequest,
      user: typeof auth.$Infer.Session.user,
   ) {
      const data: Prisma.RoleCreateInput = {
         roleName: payload.roleName,
         creator: { connect: { id: user.id } },
      };
      return await roleRepository.create(data);
   }

   async updateRole(
      payload: UpdateRoleRequest,
      id: string,
      user: typeof auth.$Infer.Session.user,
   ) {
      const data: Prisma.RoleUpdateInput = {
         roleName: payload.roleName,
         status: payload.status,
         updater: {
            connect: {
               id: user.id,
            },
         },
      };
      return await roleRepository.update(id, data);
   }

   async assignRoleToUser(payload: AssignRoleToUserRequest) {
      return await roleRepository.assignRoleToUser(
         payload.userId,
         payload.roleId,
      );
   }

   async removeRoleFromUser(payload: RemoveRoleFromUserRequest) {
      return await roleRepository.removeRoleFromUser(
         payload.userId,
         payload.roleId,
      );
   }

   async assignPermissionToRole(payload: AssignPermissionToRoleRequest) {
      return await roleRepository.assignPermissionToRole(
         payload.roleId,
         payload.permissionId,
      );
   }

   async removePermissionFromRole(payload: RemovePermissionFromRoleRequest) {
      return await roleRepository.removePermissionFromRole(
         payload.roleId,
         payload.permissionId,
      );
   }
}

export const roleService = new RoleService();
