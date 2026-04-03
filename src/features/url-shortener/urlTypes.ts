import {
   CreateUrlSchema,
   DeleteUrlSchema,
   GeoDataSchema,
   GetUrlSchema,
   LogClickSchema,
   UpdateUrlSchema,
} from './urlSchema.js';

import { z } from 'zod';

export type GeoDataSchema = z.infer<typeof GeoDataSchema>;
export type GetUrlSchema = z.infer<typeof GetUrlSchema>;
export type LogClickParams = z.infer<typeof LogClickSchema>;
export type CreateUrlRequest = z.infer<typeof CreateUrlSchema>;
export type UpdateUrlRequest = z.infer<typeof UpdateUrlSchema>;
export type DeleteUrlRequest = z.infer<typeof DeleteUrlSchema>;

export interface GetUrlResponse {
   data: {
      id: string;
      originalUrl: string;
      shortCode: string;
      status: string;
      createdAt: Date;
      _count?: {
         urlDetails: number;
      };
   }[];
   meta: {
      page: number;
      limit: number;
      totalRecords: number;
      totalPages: number;
   };
}
