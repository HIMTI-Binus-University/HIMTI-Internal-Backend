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
   ): Promise<GetPermissionResponse> {
      const { data, total } = await permissionRepository.findAll(params);
      return {
         data,
         meta: {
            page: params.page,
            limit: params.limit,
            totalRecords: total,
            totalPages: Math.ceil(total / params.limit),
         },
      };
   }
}

export const permissionService = new PermissionService();
