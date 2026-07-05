import { Prisma, Role } from '@prisma/client';
import { auth } from '@/utils/auth.js';
import { AppError } from '@/utils/appError.js';
import { buildDeletedUniqueValue } from '@/utils/softDelete.js';
import { getAuthorizedStatusFilter } from '@/utils/statusAccess.js';
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
   async getRoles(
      params: GetRoleQuery,
      user: typeof auth.$Infer.Session.user,
   ): Promise<GetRoleResponse> {
      const query = {
         ...params,
         status: getAuthorizedStatusFilter(params.status, user),
      };
      const { data, total } = await roleRepository.findAll(query);

      return {
         data: data.map(({ roleHasPermissions, ...role }) => ({
            ...role,
            permissions: roleHasPermissions.map((rhp) => rhp.permission),
         })),
         meta: {
            page: query.page,
            limit: query.limit,
            totalRecords: total,
            totalPages: Math.ceil(total / query.limit),
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
   ): Promise<Role> {
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

   async deleteRole(
      id: string,
      user: typeof auth.$Infer.Session.user,
   ): Promise<Role> {
      const role = await roleRepository.findById(id);

      if (!role) {
         throw new AppError('Role not found', 404);
      }

      const updateData: Prisma.RoleUpdateInput = {
         roleName: buildDeletedUniqueValue(role.roleName, role.id, 255),
         status: 'INACTIVE',
         updater: {
            connect: {
               id: user.id,
            },
         },
      };
      return await roleRepository.update(id, updateData);
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
