import { Prisma, Url, UrlDetail } from '@prisma/client';
import { GetUrlSchema } from './urlTypes.js';
import { parseSort } from '@/utils/sort.js';
import { prisma } from '@/config/prisma.js';

const allowedUrlSortFields = [
   'createdAt',
   'shortCode',
   'originalUrl',
   'status',
   'expiresAt',
] as const;

class UrlRepository {
   async create(data: Prisma.UrlCreateInput): Promise<Url> {
      return await prisma.url.create({ data });
   }

   async update(id: string, data: Prisma.UrlUpdateInput): Promise<Url> {
      return await prisma.url.update({
         where: { id },
         data,
      });
   }

   async findById(id: string): Promise<Url | null> {
      return await prisma.url.findUnique({
         where: { id },
      });
   }

   async findByCode(shortCode: string): Promise<Url | null> {
      return await prisma.url.findUnique({
         where: { shortCode },
      });
   }

   async findAll(params: GetUrlSchema, userId: string) {
      const { page, limit, search, sort, status } = params;

      const where: Prisma.UrlWhereInput = {
         ...(status && { status }),
      };

      const adminRole = await prisma.userHasRole.findFirst({
         where: {
            userId: userId,
            role: {
               roleName: 'Admin',
            },
         },
      });

      const isAdmin = !!adminRole;

      if (!isAdmin) {
         where.createdBy = userId;
      }

      if (search) {
         where.OR = [
            { originalUrl: { contains: search, mode: 'insensitive' } },
            { shortCode: { contains: search, mode: 'insensitive' } },
         ];
      }

      const sortOption = parseSort(sort, allowedUrlSortFields, {
         field: 'createdAt',
         direction: 'desc',
      });
      const orderBy: Prisma.UrlOrderByWithRelationInput = {
         [sortOption.field]: sortOption.direction,
      };

      const skip = (page - 1) * limit;

      const [data, total] = await prisma.$transaction([
         prisma.url.findMany({
            where,
            orderBy,
            skip,
            take: limit,
         }),
         prisma.url.count({ where }),
      ]);

      return { data, total };
   }

   async createLog(data: Prisma.UrlDetailCreateInput): Promise<UrlDetail> {
      return await prisma.urlDetail.create({ data });
   }
}

export const urlRepository = new UrlRepository();
