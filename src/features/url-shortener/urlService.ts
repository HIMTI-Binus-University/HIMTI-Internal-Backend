import { PrismaClient, Prisma } from '@prisma/client';
import { Url as UrlModel, UrlDetail as UrlDetailModel } from '@prisma/client';
import {
   CreateUrlRequest,
   GetUrlResponse,
   GetUrlSchema,
   LogClickParams,
   UpdateUrlRequest,
} from './urlTypes.js';
import { auth } from '@/utils/auth.js';

const prisma = new PrismaClient();

class UrlService {
   async createUrl(
      payload: CreateUrlRequest,
      user: typeof auth.$Infer.Session.user,
   ): Promise<UrlModel> {
      return await prisma.url.create({
         data: {
            originalUrl: payload.originalUrl,
            shortCode: payload.shortCode,
            createdBy: user.name,
            expiresAt: payload.expiresAt,
         },
      });
   }

   async updateUrl(
      payload: UpdateUrlRequest,
      id: string,
      user: typeof auth.$Infer.Session.user,
   ): Promise<UrlModel> {
      return await prisma.url.update({
         where: {
            id: id,
         },
         data: {
            originalUrl: payload.originalUrl,
            shortCode: payload.shortCode,
            updatedBy: user.name,
            expiresAt: payload.expiresAt,
            status: payload.status,
         },
      });
   }

   async getUrlByCode(shortCode: string) {
      return await prisma.url.findUnique({
         where: {
            shortCode: shortCode,
         },
      });
   }

   async getUrls(params: GetUrlSchema): Promise<GetUrlResponse> {
      const { page, limit, search, sort } = params;

      const where: Prisma.UrlWhereInput = {};
      if (search) {
         where.OR = [
            { originalUrl: { contains: search, mode: 'insensitive' } },
            { shortCode: { contains: search, mode: 'insensitive' } },
            { createdBy: { contains: search, mode: 'insensitive' } },
         ];
      }

      let orderBy: Prisma.UrlOrderByWithRelationInput = {};
      if (sort) {
         const [field, direction] = sort.split(':');
         if (direction === 'asc' || direction === 'desc') {
            orderBy = { [field]: direction };
         }
      } else {
         orderBy = { createdAt: 'desc' };
      }

      const skip = (page - 1) * limit;

      const [url, total] = await prisma.$transaction([
         prisma.url.findMany({
            where,
            orderBy,
            skip,
            take: limit,
         }),
         prisma.url.count({ where }),
      ]);

      return {
         data: url,
         meta: {
            page,
            limit,
            totalRecords: total,
            totalPages: Math.ceil(total / limit),
         },
      };
   }

   async logClick(payload: LogClickParams): Promise<UrlDetailModel> {
      return await prisma.urlDetail.create({
         data: {
            urlId: payload.urlId,
            ip: payload.ip,
            userAgent: payload.userAgent,
            city: payload.city,
            country: payload.country,
            region: payload.region,
            latitude: payload.latitude,
            longitude: payload.longitude,
         },
      });
   }
}

export const urlService = new UrlService();
