import { z } from 'zod';
import {
   AddLinkWorkspaceMemberSchema,
   AttachWorkspaceLinkSchema,
   ChangeLinkWorkspaceMemberRoleSchema,
   CreateLinkWorkspaceSchema,
   CreateWorkspaceLinkSchema,
   ListLinkWorkspacesSchema,
   UpdateLinkWorkspaceSchema,
   UpdateWorkspaceLinkSchema,
} from './linkWorkspaceSchema.js';

export type ListLinkWorkspacesQuery = z.infer<typeof ListLinkWorkspacesSchema>;
export type CreateLinkWorkspaceRequest = z.infer<
   typeof CreateLinkWorkspaceSchema
>;
export type UpdateLinkWorkspaceRequest = z.infer<
   typeof UpdateLinkWorkspaceSchema
>;
export type AddLinkWorkspaceMemberRequest = z.infer<
   typeof AddLinkWorkspaceMemberSchema
>;
export type ChangeLinkWorkspaceMemberRoleRequest = z.infer<
   typeof ChangeLinkWorkspaceMemberRoleSchema
>;
export type CreateWorkspaceLinkRequest = z.infer<
   typeof CreateWorkspaceLinkSchema
>;
export type AttachWorkspaceLinkRequest = z.infer<
   typeof AttachWorkspaceLinkSchema
>;
export type UpdateWorkspaceLinkRequest = z.infer<
   typeof UpdateWorkspaceLinkSchema
>;
