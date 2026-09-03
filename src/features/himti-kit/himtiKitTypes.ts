import {z} from 'zod'
import { 
    CreateKitResourcesSchema,
    UpdateKitResourcesSchema,
    GetKitResourcesSchema,
    DeleteKitResourcesSchema,
    CreateKitSoftwareSchema,
    UpdateKitSoftwareSchema,
    DeleteKitSoftwareSchema,
    MajorEnum
} from './himtiKitSchema.js'

// ==========================================
// TYPES UNTUK RESOURCES
// ==========================================

export type CreateKitResourcesInput = z.infer<typeof CreateKitResourcesSchema>;
export type UpdateKitResourcesInput = z.infer<typeof UpdateKitResourcesSchema>;
export type GetKitResourcesQuery = z.infer<typeof GetKitResourcesSchema>;
export type DeleteKitResourcesQuery = z.infer<typeof DeleteKitResourcesSchema>;

// ==========================================
// TYPES UNTUK SOFTWARE
// ==========================================

export type CreateKitSoftwareInput = z.infer<typeof CreateKitSoftwareSchema>;
export type UpdateKitSoftwareInput = z.infer<typeof UpdateKitSoftwareSchema>;
export type DeleteKitSoftwareQuery = z.infer<typeof DeleteKitSoftwareSchema>;

export type MajorType = z.infer<typeof MajorEnum>;

export interface GetKitResourcesResponse {
    data : {
        id: string;
        title: string;
        description: string;
        downloadUrl: string;
        coverImageUrl: string | null;
        semester: number;
        major: MajorType;
        createdAt: Date;
        updatedAt: Date | null;
    }[];
    meta: {
        page: number;
        limit: number;
        totalRecords: number;
        totalPages: number;
    };
}