import {z} from 'zod';
import { normalizeHttpUrl } from '@/utils/httpUrl.js';

const optionalHttpUrlSchema = z
   .string()
   .nullable()
   .transform((value, context) => {
      if (value === null || value.trim() === '') return null;

      try {
         return normalizeHttpUrl(value);
      } catch {
         context.addIssue({
            code: 'custom',
            message:
               'Enter a valid web link. Only HTTP and HTTPS links are allowed.',
         });
         return z.NEVER;
      }
   });

export const MajorEnum = z.enum([
  "COMPUTER_SCIENCE-REGULAR",
  "COMPUTER_SCIENCE_AND_MATHEMATICS",
  "COMPUTER_SCIENCE_AND_STATISTIC",
  "COMPUTER_SCIENCE-SOFTWARE_ENGINEERING",
  "ARTIFICIAL_INTELLIGENCE",
  "CYBER_SECURITY",
  "DATA_SCIENCE",
  "GAME_APPLICATION_AND_TECHNOLOGY",
  "MOBILE_APPLICATION_AND_TECHNOLOGY"
]);

export const CreateKitResourcesSchema = z.object ({
   title : z.string().min(1),
   description: z.string(),
   downloadUrl: z.string().url("Enter a valid web link"),
   coverImageUrl: optionalHttpUrlSchema
      .optional()
      .transform((value) => value ?? null),
   semester: z.coerce.number().min(1).max(8),
   major: MajorEnum
});

export const UpdateKitResourcesSchema = CreateKitResourcesSchema.partial();

export const DeleteKitResourcesSchema = z.object({});

export const GetKitResourcesSchema = z.object({
   major : MajorEnum.optional()
})

export const CreateKitSoftwareSchema = z.object ({
   name : z.string().min(1),
   description: z.string(),
   downloadUrl: z.string().url("Enter a valid web link"),
   coverImageUrl: optionalHttpUrlSchema
      .optional()
      .transform((value) => value ?? null)
});

export const UpdateKitSoftwareSchema = CreateKitSoftwareSchema.partial();

export const DeleteKitSoftwareSchema = z.object({});
