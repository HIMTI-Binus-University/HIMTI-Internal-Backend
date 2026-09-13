import {z} from 'zod';
import { MajorHIMTIKit } from '@prisma/client';
import { normalizeHttpUrl } from '@/utils/httpUrl.js';

export const MajorEnum = z.nativeEnum(MajorHIMTIKit);

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
   })

// ==========================================
// SCHEMA UNTUK RESOURCES
// ==========================================

export const CreateKitResourcesSchema = z.object ({
   title : z.string().min(1, "Title is required"),
   description: z.string().optional(),
   major: MajorEnum,
   downloadUrl: z.string().url("Enter a valid web link"),
   coverImageUrl: optionalHttpUrlSchema
      .optional()
      .transform((value) => value ?? null)
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
   downloadUrl: z.string().url("Enter a valid web link"),
   coverImageUrl: optionalHttpUrlSchema
      .optional()
      .transform((value) => value ?? null)
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
  nim: z.string().min(1, "NIM is required"),
  name: z.string().min(1, "Student full name is required"),
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