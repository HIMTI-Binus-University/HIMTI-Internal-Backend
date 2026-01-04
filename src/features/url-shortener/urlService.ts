import { Url } from '@prisma/client';
import {
   CreateUrlRequest,
   GetUrlResponse,
   GetUrlSchema,
   LogClickParams,
   UpdateUrlRequest,
} from './urlTypes.js';
import { auth } from '@/utils/auth.js';
import { urlRepository } from './urlRepository.js';

class UrlService {
   async createUrl(
      payload: CreateUrlRequest,
      user: typeof auth.$Infer.Session.user,
   ): Promise<Url> {
      const urlData = {
         originalUrl: payload.originalUrl,
         shortCode: payload.shortCode,
         createdBy: user?.name || 'Admin',
         expiresAt: payload.expiresAt ?? null,
      };
      return await urlRepository.create(urlData);
   }

   async updateUrl(
      payload: UpdateUrlRequest,
      id: string,
      user: typeof auth.$Infer.Session.user,
   ): Promise<Url> {
      const updateData = {
         originalUrl: payload.originalUrl,
         shortCode: payload.shortCode,
         updatedBy: user?.name || 'Admin',
         expiresAt: payload.expiresAt ?? null,
         status: payload.status,
      };
      return await urlRepository.update(id, updateData);
   }

   async getUrlByCode(shortCode: string) {
      return await urlRepository.findByCode(shortCode);
   }

   async getUrlById(id: string) {
      return await urlRepository.findById(id);
   }

   async getUrls(params: GetUrlSchema): Promise<GetUrlResponse> {
      const { data, total } = await urlRepository.findAll(params);
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
