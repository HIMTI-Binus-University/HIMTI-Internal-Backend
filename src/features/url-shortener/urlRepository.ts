import { PrismaClient, Prisma, Url, UrlDetail } from '@prisma/client';
import { GetUrlSchema } from './urlTypes.js';

const prisma = new PrismaClient();

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

   async findAll(params: GetUrlSchema) {
      const { page, limit, search, sort, status } = params;

      const where: Prisma.UrlWhereInput = {
         status: status,
      };

      if (search) {
         where.OR = [
            { originalUrl: { contains: search, mode: 'insensitive' } },
            { shortCode: { contains: search, mode: 'insensitive' } },
            { createdBy: { contains: search, mode: 'insensitive' } },
         ];
      }

      let orderBy: Prisma.UrlOrderByWithRelationInput = { createdAt: 'desc' };
      if (sort) {
         const [field, direction] = sort.split(':');
         if (['asc', 'desc'].includes(direction)) {
            orderBy = { [field]: direction as 'asc' | 'desc' };
         }
      }

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
