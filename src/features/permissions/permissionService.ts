import { Permission, Prisma } from '@prisma/client';
import type {
   CreatePermissionRequest,
   GetPermissionResponse,
   GetPermissionSchema,
   UpdatePermissionRequest,
} from './permissionTypes.js';
import { auth } from '@/utils/auth.js';
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
