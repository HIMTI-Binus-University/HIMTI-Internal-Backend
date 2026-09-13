import {z} from 'zod'
import { 
    MajorEnum,
    CreateKitResourcesSchema,
    UpdateKitResourcesSchema,
    ResourceParamsSchema,
    ResourceQuerySchema,
    CreateKitSoftwareSchema,
    UpdateKitSoftwareSchema,
    softwareParamsSchema,
    softwareQuerySchema,
    CreateAttendeeSchema,
    BulkImportAttendeesSchema,
    AttendeeParamsSchema,
    AttendeeQuerySchema
} from './himtiKitSchema.js'

// ==========================================
// TYPES UNTUK RESOURCES
// ==========================================

export type Major = z.infer<typeof MajorEnum>;
export type CreateKitResourcesInput = z.infer<typeof CreateKitResourcesSchema>;
export type UpdateKitResourcesInput = z.infer<typeof UpdateKitResourcesSchema>;
export type ResourceParams = z.infer<typeof ResourceParamsSchema>;
export type ResourceQuery = z.infer<typeof ResourceQuerySchema>;

// ==========================================
// TYPES UNTUK SOFTWARE
// ==========================================

export type CreateKitSoftwareInput = z.infer<typeof CreateKitSoftwareSchema>;
export type UpdateKitSoftwareInput = z.infer<typeof UpdateKitSoftwareSchema>;
export type SoftwareParams = z.infer<typeof softwareParamsSchema>;
export type SoftwareQuery = z.infer<typeof softwareQuerySchema>;

// ==========================================
// TYPES UNTUK ATTENDEE
// ==========================================

export type CreateAttendeeInput = z.infer<typeof CreateAttendeeSchema>;
export type BulkImportAttendeesInput = z.infer<typeof BulkImportAttendeesSchema>;
export type AttendeeParams = z.infer<typeof AttendeeParamsSchema>;
export type AttendeeQuery = z.infer<typeof AttendeeQuerySchema>;