import { Url, Prisma } from '@prisma/client';
import type {
   CreateUrlRequest,
   GetUrlResponse,
   GetUrlSchema,
   LogClickParams,
   UpdateUrlRequest,
} from './urlTypes.js';
import { auth } from '@/utils/auth.js';
import { urlRepository } from './urlRepository.js';
import { AppError } from '@/utils/appError.js';
import { buildDeletedUniqueValue } from '@/utils/softDelete.js';

class UrlService {
   async createUrl(
      payload: CreateUrlRequest,
      user: typeof auth.$Infer.Session.user,
   ): Promise<Url> {
      const urlData: Prisma.UrlCreateInput = {
         originalUrl: payload.originalUrl,
         shortCode: payload.shortCode,
         expiresAt: payload.expiresAt ?? null,
         creator: {
            connect: {
               id: user.id,
            },
         },
      };
      return await urlRepository.create(urlData);
   }

   async updateUrl(
      payload: UpdateUrlRequest,
      id: string,
      user: typeof auth.$Infer.Session.user,
   ): Promise<Url> {
      const updateData: Prisma.UrlUpdateInput = {
         originalUrl: payload.originalUrl,
         shortCode: payload.shortCode,
         expiresAt: payload.expiresAt ?? null,
         status: payload.status,
         updater: {
            connect: {
               id: user.id,
            },
         },
      };
      return await urlRepository.update(id, updateData);
   }

   async deleteUrl(
      id: string,
      user: typeof auth.$Infer.Session.user,
   ): Promise<Url> {
      const url = await urlRepository.findById(id);

      if (!url) {
         throw new AppError('Url not found', 404);
      }

      const updateData: Prisma.UrlUpdateInput = {
         shortCode: buildDeletedUniqueValue(url.shortCode, url.id, 100),
         status: 'INACTIVE',
         updater: {
            connect: {
               id: user.id,
            },
         },
      };
      return await urlRepository.update(id, updateData);
   }

   async getUrlByCode(shortCode: string) {
      return await urlRepository.findByCode(shortCode);
   }

   async getUrlById(id: string) {
      return await urlRepository.findById(id);
   }

   async getUrls(
      params: GetUrlSchema,
      user: typeof auth.$Infer.Session.user,
   ): Promise<GetUrlResponse> {
      const { data, total } = await urlRepository.findAll(params, user.id);
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

   async logClick(payload: LogClickParams) {
      return await urlRepository.createLog({
         url: {
            connect: {
               id: payload.urlId,
            },
         },
         ip: payload.ip,
         userAgent: payload.userAgent,
         city: payload.city,
         country: payload.country,
         region: payload.region,
         latitude: payload.latitude,
         longitude: payload.longitude,
         isp: payload.isp,
         timezone: payload.timezone,
      });
   }
}

export const urlService = new UrlService();
