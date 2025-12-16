import { PrismaClient } from '@/generated/prisma/client.js';
import type { UrlModel, UrlDetailsModel } from '@/generated/prisma/models.js';
import {
   CreateUrlRequest,
   LogClickParams,
   UpdateUrlRequest,
} from './urlTypes.js';

const prisma = new PrismaClient();

class UrlService {
   async createUrl(payload: CreateUrlRequest): Promise<UrlModel> {
      try {
         return await prisma.url.create({
            data: {
               originalUrl: payload.originalUrl,
               shortCode: payload.shortCode,
               createdBy: 'User', // ini nanti diisi pake middleware dari auth, for now gini dlu aja
               expiresAt: payload.expiresAt,
            },
         });
      } catch (error) {
         console.error(error);
         throw new Error('Failed to create new url');
      }
   }

   async updateUrl(payload: UpdateUrlRequest, id: string): Promise<UrlModel> {
      try {
         return await prisma.url.update({
            where: {
               urlId: id,
            },
            data: {
               originalUrl: payload.originalUrl,
               shortCode: payload.shortCode,
               createdBy: 'User',
               expiresAt: payload.expiresAt,
               status: payload.status,
            },
         });
      } catch (error) {
         console.error(error);
         throw new Error('Failed to create new url');
      }
   }

   async getUrlByCode(shortCode: string) {
      return await prisma.url.findUnique({
         where: {
            shortCode: shortCode,
         },
      });
   }

   async logClick(payload: LogClickParams): Promise<UrlDetailsModel> {
      return await prisma.urlDetails.create({
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
