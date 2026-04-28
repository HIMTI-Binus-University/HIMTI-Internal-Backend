import { z } from 'zod';
import {
   AssignPermissionToRoleSchema,
   AssignRoleToUserSchema,
   CreateRoleSchema,
   GetRoleSchema,
   RemovePermissionFromRoleSchema,
   RemoveRoleFromUserSchema,
   UpdateRoleSchema,
} from './roleSchema.js';

export type CreateRoleRequest = z.infer<typeof CreateRoleSchema>;
export type UpdateRoleRequest = z.infer<typeof UpdateRoleSchema>;
export type GetRoleQuery = z.infer<typeof GetRoleSchema>;
export type AssignRoleToUserRequest = z.infer<typeof AssignRoleToUserSchema>;
export type RemoveRoleFromUserRequest = z.infer<
   typeof RemoveRoleFromUserSchema
>;
export type AssignPermissionToRoleRequest = z.infer<
   typeof AssignPermissionToRoleSchema
>;
export type RemovePermissionFromRoleRequest = z.infer<
   typeof RemovePermissionFromRoleSchema
>;

export interface GetRoleResponse {
   data: {
      id: string;
      roleName: string;
      status: string;
      createdAt: Date;
      permissions: {
         id: string;
         name: string;
         status: string;
      }[];
   }[];
   meta: {
      page: number;
      limit: number;
      totalRecords: number;
      totalPages: number;
   };
}
