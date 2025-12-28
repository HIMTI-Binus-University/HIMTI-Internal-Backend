import { z } from 'zod';

export const CreateUrlSchema = z.object({
   originalUrl: z.string().url({ message: 'Invalid URL format' }),
   shortCode: z
      .string()
      .min(3, { message: 'Short code must be at least 3 characters' }),
   expresAt: z.preprocess(
      (someArgs) => {
         if (someArgs === null) return undefined;
         return someArgs;
      },
      z.coerce
         .date()
         .min(new Date(), {
            message: 'Expiration date cannot be in the past',
         })
         .optional(),
   ),
});

export const UpdateUrlSchema = z.object({
   originalUrl: z.string().url({ message: 'Invalid URL format' }).optional(),
   shortCode: z
      .string()
      .min(3, { message: 'Short code must be at least 3 characters' })
      .optional(),
   expresAt: z.preprocess(
      (someArgs) => {
         if (someArgs === null) return undefined;
         return someArgs;
      },
      z.coerce
         .date()
         .min(new Date(), {
            message: 'Expiration date cannot be in the past',
         })
         .optional(),
   ),
   status: z.enum(['a', 'd']).optional(),
});

export const LogClickSchema = z.object({
   urlId: z.string().uuid(),
   ip: z.string(),
   userAgent: z.string(),
   city: z.string().nullish(),
   country: z.string().nullish(),
   region: z.string().nullish(),
   latitude: z.float64().nullish(),
   longitude: z.float64().nullish(),
   isp: z.string().nullish(),
   timezone: z.string().nullish(),
});

export const GetUrlSchema = z.object({
   page: z.coerce.number().min(1).default(1),
   limit: z.coerce.number().min(1).max(100).default(10),
   search: z.string().optional(),
   sort: z.string().default('createdAt:desc'),
   status: z.enum(['a', 'd']),
});

export type GetUrlSchema = z.infer<typeof GetUrlSchema>;
export type LogClickParams = z.infer<typeof LogClickSchema>;
export type CreateUrlRequest = z.infer<typeof CreateUrlSchema>;
export type UpdateUrlRequest = z.infer<typeof UpdateUrlSchema>;

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
