import {
   CreatePermissionSchema,
   GetPermissionSchema,
   UpdatePermissionSchema,
} from './permissionSchema.js';
import { z } from 'zod';

export type CreatePermissionRequest = z.infer<typeof CreatePermissionSchema>;
export type UpdatePermissionRequest = z.infer<typeof UpdatePermissionSchema>;
export type GetPermissionSchema = z.infer<typeof GetPermissionSchema>;

export interface GetPermissionResponse {
   data: {
      id: string;
      name: string;
      status: string;
      createdAt: Date;
   }[];
   meta: {
      page: number;
      limit: number;
      totalRecords: number;
      totalPages: number;
   };
}
