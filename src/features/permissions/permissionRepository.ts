import { PrismaClient, Prisma, Permission } from '@prisma/client';
import { GetPermissionSchema } from './permissionTypes.js';

const prisma = new PrismaClient();

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

      let orderBy: Prisma.PermissionOrderByWithRelationInput = {
         createdAt: 'desc',
      };
      if (sort) {
         const [field, direction] = sort.split(':');
         if (['asc', 'desc'].includes(direction)) {
            orderBy = { [field]: direction as 'asc' | 'desc' };
         }
      }

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
