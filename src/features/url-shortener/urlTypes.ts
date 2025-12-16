import { z } from 'zod';

export const CreateUrlSchema = z.object({
   originalUrl: z.string().url({ message: 'Invalid URL format' }),
   shortCode: z
      .string()
      .min(3, { message: 'Short code must be at least 3 characters' }),
   expiresAt: z.coerce
      .date()
      .min(new Date(), {
         message: 'Expiration date cannot be in the past',
      })
      .optional(),
});

export const UpdateUrlSchema = z.object({
   originalUrl: z.string().url({ message: 'Invalid URL format' }).optional(),
   shortCode: z
      .string()
      .min(3, { message: 'Short code must be at least 3 characters' })
      .optional(),
   expiresAt: z.coerce
      .date()
      .min(new Date(), {
         message: 'Expiration date cannot be in the past',
      })
      .optional(),
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

export type LogClickParams = z.infer<typeof LogClickSchema>;
export type CreateUrlRequest = z.infer<typeof CreateUrlSchema>;
export type UpdateUrlRequest = z.infer<typeof UpdateUrlSchema>;
