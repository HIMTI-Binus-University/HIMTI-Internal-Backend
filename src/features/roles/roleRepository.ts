import { Prisma, Role } from '@prisma/client';
import type { GetRoleQuery } from './roleTypes.js';
import { parseSort } from '@/utils/sort.js';
import { prisma } from '@/config/prisma.js';

const allowedRoleSortFields = ['createdAt', 'roleName', 'status'] as const;

class RoleRepository {
   async create(data: Prisma.RoleCreateInput): Promise<Role> {
      return await prisma.role.create({ data });
   }

   async update(id: string, data: Prisma.RoleUpdateInput): Promise<Role> {
      return await prisma.role.update({ where: { id }, data });
   }

   async findById(id: string) {
      return await prisma.role.findUnique({
         where: { id },
         select: {
            id: true,
            roleName: true,
            status: true,
            createdAt: true,
            roleHasPermissions: {
               where: {
                  permission: {
                     status: 'ACTIVE',
                  },
               },
               select: {
                  permission: {
                     select: { id: true, name: true, status: true },
                  },
               },
            },
         },
      });
   }

   async findAll(params: GetRoleQuery) {
      const { page, limit, search, sort, status } = params;

      const where: Prisma.RoleWhereInput = {
         ...(status && { status }),
      };

      if (search) {
         where.OR = [{ roleName: { contains: search, mode: 'insensitive' } }];
      }

      const sortOption = parseSort(sort, allowedRoleSortFields, {
         field: 'createdAt',
         direction: 'desc',
      });
      const orderBy: Prisma.RoleOrderByWithRelationInput = {
         [sortOption.field]: sortOption.direction,
      };

      const skip = (page - 1) * limit;

      const [data, total] = await prisma.$transaction([
         prisma.role.findMany({
            where,
            orderBy,
            skip,
            take: limit,
            select: {
               id: true,
               roleName: true,
               status: true,
               createdAt: true,
               roleHasPermissions: {
                  where: {
                     permission: {
                        status: 'ACTIVE',
                     },
                  },
                  select: {
                     permission: {
                        select: { id: true, name: true, status: true },
                     },
                  },
               },
            },
         }),
         prisma.role.count({ where }),
      ]);

      return { data, total };
   }

   async assignRoleToUser(userId: string, roleId: string) {
      return await prisma.userHasRole.create({
         data: { userId, roleId },
      });
   }

   async removeRoleFromUser(userId: string, roleId: string) {
      return await prisma.userHasRole.delete({
         where: { userId_roleId: { userId, roleId } },
      });
   }

   async assignPermissionToRole(roleId: string, permissionId: string) {
      return await prisma.roleHasPermission.create({
         data: { roleId, permissionId },
      });
   }

   async removePermissionFromRole(roleId: string, permissionId: string) {
      return await prisma.roleHasPermission.delete({
         where: { roleId_permissionId: { roleId, permissionId } },
      });
   }
}

export const roleRepository = new RoleRepository();
