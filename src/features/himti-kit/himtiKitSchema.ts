import {z} from 'zod';
import { MajorHIMTIKit } from '@prisma/client';
import { normalizeHttpUrl } from '@/utils/httpUrl.js';

export const MajorEnum = z.nativeEnum(MajorHIMTIKit);

const toHttpUrl = (value: string, context: z.RefinementCtx): string => {
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
};

const optionalHttpUrlSchema = z
   .string()
   .nullable()
   .transform((value, context) => {
      if (value === null || value.trim() === '') return null;
      return toHttpUrl(value, context);
   })

const requiredHttpUrlSchema = z
   .string()
   .min(1, 'Enter a valid web link')
   .transform((toHttpUrl)
   );

// ==========================================
// SCHEMA UNTUK RESOURCES
// ==========================================

export const CreateKitResourcesSchema = z.object ({
   title : z.string().min(1, "Title is required"),
   description: z.string().optional(),
   majors: z
      .array(MajorEnum)
      .min(1, "Select at least one major")
      .transform((majors) => Array.from(new Set(majors))),
   downloadUrl: requiredHttpUrlSchema,
   coverImageUrl: optionalHttpUrlSchema.optional()
});

export const UpdateKitResourcesSchema = CreateKitResourcesSchema.partial();

export const ResourceParamsSchema = z.object({
  id: z.string().min(1),
});
 
export const ResourceQuerySchema = z.object({
  search: z.string().optional(),
  major: MajorEnum.optional(),
});


// ==========================================
// SCHEMA UNTUK SOFTWARE
// ==========================================

export const CreateKitSoftwareSchema = z.object ({
   name : z.string().min(1),
   description: z.string().min(1, 'Description is required'),
   downloadUrl: requiredHttpUrlSchema,
   coverImageUrl: optionalHttpUrlSchema.optional()
});

export const UpdateKitSoftwareSchema = CreateKitSoftwareSchema.partial();

export const softwareParamsSchema = z.object({
  id: z.string().min(1),
});
 
export const softwareQuerySchema = z.object({
  search: z.string().optional(),
});

// ==========================================
// SCHEMA UNTUK STUDENT HIMTI KIT
// ==========================================
export const CreateAttendeeSchema  = z.object({
  nim: z.string().trim().min(1, "NIM is required"),
  name: z.string().trim().min(1, "Student full name is required"),
});
 
export const BulkImportAttendeesSchema = z.object({
  attendees: z.array(CreateAttendeeSchema).min(1, 'At least one attendee is required')
});
 
export const AttendeeParamsSchema = z.object({
  id: z.string().min(1)
});
 
export const AttendeeQuerySchema = z.object({
  search: z.string().optional()
});

// ==========================================
// SCHEMA UNTUK APPEARANCE
// ==========================================

const hexColorSchema = z
   .string()
   .regex(/^#([0-9A-Fa-f]{6})$/, 'Enter a valid hex color code (e.g. #0284c7)');

export const UpsertKitAppearanceSchema = z.object({
   accentColor: hexColorSchema,
   backgroundImageUrl: requiredHttpUrlSchema,
   overlayEnabled: z.boolean(),
   overlayDarkness: z
      .number()
      .int()
      .min(0, 'Minimum is 0%')
      .max(100, 'Maximum is 100%'),
   blurEnabled: z.boolean(),
   blurIntensity: z
      .number()
      .int()
      .min(0, 'Minimum is 0px')
      .max(24, 'Maximum is 24px'),
});
 
export const UpdateKitAppearanceSchema = UpsertKitAppearanceSchema.partial();