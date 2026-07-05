import { Permission, Prisma } from '@prisma/client';
import type {
   CreatePermissionRequest,
   GetPermissionResponse,
   GetPermissionSchema,
   UpdatePermissionRequest,
} from './permissionTypes.js';
import { auth } from '@/utils/auth.js';
import { AppError } from '@/utils/appError.js';
import { buildDeletedUniqueValue } from '@/utils/softDelete.js';
import { getAuthorizedStatusFilter } from '@/utils/statusAccess.js';
import { permissionRepository } from './permissionRepository.js';

class PermissionService {
   async createPermission(
      payload: CreatePermissionRequest,
      user: typeof auth.$Infer.Session.user,
   ): Promise<Permission> {
      const permissionData: Prisma.PermissionCreateInput = {
         name: payload.name,
         creator: {
            connect: {
               id: user.id,
            },
         },
      };
      return await permissionRepository.create(permissionData);
   }

   async updatePermission(
      payload: UpdatePermissionRequest,
      id: string,
   ): Promise<Permission> {
      const updateData: Prisma.PermissionUpdateInput = {
         name: payload.name,
         status: payload.status,
      };
      return await permissionRepository.update(id, updateData);
   }

   async deletePermission(
      id: string,
      user: typeof auth.$Infer.Session.user,
   ): Promise<Permission> {
      const permission = await permissionRepository.findById(id);

      if (!permission) {
         throw new AppError('Permission not found', 404);
      }

      const updateData: Prisma.PermissionUpdateInput = {
         name: buildDeletedUniqueValue(permission.name, permission.id, 255),
         status: 'INACTIVE',
         updater: {
            connect: {
               id: user.id,
            },
         },
      };
      return await permissionRepository.update(id, updateData);
   }

   async getPermissions(
      params: GetPermissionSchema,
      user: typeof auth.$Infer.Session.user,
   ): Promise<GetPermissionResponse> {
      const query = {
         ...params,
         status: getAuthorizedStatusFilter(params.status, user),
      };
      const { data, total } = await permissionRepository.findAll(query);
      return {
         data,
         meta: {
            page: query.page,
            limit: query.limit,
            totalRecords: total,
            totalPages: Math.ceil(total / query.limit),
         },
      };
   }
}

export const permissionService = new PermissionService();
