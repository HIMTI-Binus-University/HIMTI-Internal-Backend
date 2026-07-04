import { z } from 'zod';

export const CreateUrlSchema = z.object({
   originalUrl: z.string().url({ message: 'Invalid URL format' }),
   shortCode: z
      .string()
      .min(3, { message: 'Short code must be at least 3 characters' })
      .regex(/^[a-zA-Z0-9]+$/, {
         message: 'Short code cannot contain special characters or spaces',
      }),
   expiresAt: z.preprocess(
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
      .regex(/^[a-zA-Z0-9]+$/, {
         message: 'Short code cannot contain special characters or spaces',
      })
      .optional(),
   expiresAt: z.preprocess(
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
   status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});

export const DeleteUrlSchema = z.object({});

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
   status: z.enum(['ACTIVE', 'INACTIVE']),
});

export const GeoDataSchema = z.object({
   status: z.string().optional(),
   city: z.string().nullish(),
   country: z.string().nullish(),
   region: z.string().nullish(),
   regionName: z.string().nullish(),
   lat: z.number().nullish(),
   lon: z.number().nullish(),
   isp: z.string().nullish(),
   timezone: z.string().nullish(),
});
