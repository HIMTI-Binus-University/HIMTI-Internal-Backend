import { Prisma, Permission } from '@prisma/client';
import { GetPermissionSchema } from './permissionTypes.js';
import { parseSort } from '@/utils/sort.js';
import { prisma } from '@/config/prisma.js';

const allowedPermissionSortFields = ['createdAt', 'name', 'status'] as const;

class PermissionRepository {
   async create(data: Prisma.PermissionCreateInput): Promise<Permission> {
      return await prisma.permission.create({ data });
   }

   async update(
      id: string,
      data: Prisma.PermissionUpdateInput,
   ): Promise<Permission> {
      return await prisma.permission.update({
         where: { id },
         data,
      });
   }

   async findById(id: string): Promise<Permission | null> {
      return await prisma.permission.findUnique({
         where: { id },
      });
   }

   async findAll(params: GetPermissionSchema) {
      const { page, limit, search, sort, status } = params;

      const where: Prisma.PermissionWhereInput = {
         ...(status && { status }),
      };

      if (search) {
         where.OR = [{ name: { contains: search, mode: 'insensitive' } }];
      }

      const sortOption = parseSort(sort, allowedPermissionSortFields, {
         field: 'createdAt',
         direction: 'desc',
      });
      const orderBy: Prisma.PermissionOrderByWithRelationInput = {
         [sortOption.field]: sortOption.direction,
      };

      const skip = (page - 1) * limit;

      const [data, total] = await prisma.$transaction([
         prisma.permission.findMany({
            where,
            orderBy,
            skip,
            take: limit,
         }),
         prisma.permission.count({ where }),
      ]);

      return { data, total };
   }
}

export const permissionRepository = new PermissionRepository();
