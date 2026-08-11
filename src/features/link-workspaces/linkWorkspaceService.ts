import { auth } from '@/utils/auth.js';
import { AppError } from '@/utils/appError.js';
import { isAdminUser } from '@/utils/statusAccess.js';
import { linkWorkspaceRepository } from './linkWorkspaceRepository.js';
import {
   canEditWorkspaceLinks,
   canManageWorkspace,
   canReadWorkspace,
   redactWorkspaceMemberDetails,
} from './linkWorkspacePolicy.js';
import type {
   AddLinkWorkspaceMemberRequest,
   AttachWorkspaceLinkRequest,
   ChangeLinkWorkspaceMemberRoleRequest,
   CreateLinkWorkspaceRequest,
   CreateWorkspaceLinkRequest,
   ListLinkWorkspacesQuery,
   UpdateLinkWorkspaceRequest,
   UpdateWorkspaceLinkRequest,
} from './linkWorkspaceTypes.js';

type SessionUser = typeof auth.$Infer.Session.user;

class LinkWorkspaceService {
   private async authorize(
      workspaceId: string,
      user: SessionUser,
      allowedRoles: Array<'OWNER' | 'EDITOR' | 'VIEWER'>,
      requireActive = false,
   ) {
      const workspace = await linkWorkspaceRepository.findById(workspaceId);
      if (!workspace) throw new AppError('Link workspace not found', 404);
      if (requireActive && workspace.status !== 'ACTIVE') {
         throw new AppError('Link workspace is archived', 409);
      }
      if (isAdminUser(user)) return workspace;
      const membership = workspace.members.find(
         (member) => member.userId === user.id,
      );
      const policyAllows =
         allowedRoles.length === 3
            ? membership && canReadWorkspace(membership.role)
            : allowedRoles.includes('EDITOR')
              ? membership && canEditWorkspaceLinks(membership.role)
              : membership && canManageWorkspace(membership.role);
      if (!membership || !policyAllows) {
         throw new AppError(
            'You are not allowed to access this workspace',
            403,
         );
      }
      return workspace;
   }

   async list(query: ListLinkWorkspacesQuery, user: SessionUser) {
      const { data, total } = await linkWorkspaceRepository.findAll(
         query,
         user.id,
         isAdminUser(user),
      );
      return {
         data: data.map((workspace) =>
            redactWorkspaceMemberDetails(workspace, user.id, isAdminUser(user)),
         ),
         meta: {
            page: query.page,
            limit: query.limit,
            totalRecords: total,
            totalPages: Math.ceil(total / query.limit),
         },
      };
   }

   async create(payload: CreateLinkWorkspaceRequest, user: SessionUser) {
      return linkWorkspaceRepository.create(
         payload.name,
         payload.description,
         user.id,
      );
   }

   async get(workspaceId: string, user: SessionUser) {
      const workspace = await this.authorize(workspaceId, user, [
         'OWNER',
         'EDITOR',
         'VIEWER',
      ]);
      return redactWorkspaceMemberDetails(
         workspace,
         user.id,
         isAdminUser(user),
      );
   }

   async update(
      workspaceId: string,
      payload: UpdateLinkWorkspaceRequest,
      user: SessionUser,
   ) {
      return linkWorkspaceRepository.update(
         workspaceId,
         payload,
         user.id,
         isAdminUser(user),
      );
   }

   async archive(workspaceId: string, user: SessionUser) {
      return linkWorkspaceRepository.setStatus(
         workspaceId,
         'ARCHIVED',
         user.id,
         isAdminUser(user),
      );
   }

   async listMembers(workspaceId: string, user: SessionUser) {
      await this.authorize(workspaceId, user, ['OWNER']);
      return linkWorkspaceRepository.listMembers(workspaceId);
   }

   async addMember(
      workspaceId: string,
      payload: AddLinkWorkspaceMemberRequest,
      user: SessionUser,
   ) {
      return linkWorkspaceRepository.addMember(
         workspaceId,
         payload.userId,
         payload.role,
         user.id,
         isAdminUser(user),
      );
   }

   async changeMemberRole(
      workspaceId: string,
      targetUserId: string,
      payload: ChangeLinkWorkspaceMemberRoleRequest,
      user: SessionUser,
   ) {
      const result = await linkWorkspaceRepository.changeMemberRole(
         workspaceId,
         targetUserId,
         payload.role,
         user.id,
         isAdminUser(user),
      );
      if (!result) throw new AppError('Workspace member not found', 404);
      if (result === 'SELF_ROLE_CHANGE') {
         throw new AppError('You cannot change your own workspace role', 403);
      }
      if (result === 'LAST_OWNER') {
         throw new AppError(
            'The owner can only be changed by promoting another member to owner',
            409,
         );
      }
      return result;
   }

   async removeMember(
      workspaceId: string,
      targetUserId: string,
      user: SessionUser,
   ) {
      const result = await linkWorkspaceRepository.removeMember(
         workspaceId,
         targetUserId,
         user.id,
         isAdminUser(user),
      );
      if (!result) throw new AppError('Workspace member not found', 404);
      if (result === 'LAST_OWNER') {
         throw new AppError('A workspace must have at least one owner', 409);
      }
      return result;
   }

   async listLinks(workspaceId: string, user: SessionUser) {
      await this.authorize(workspaceId, user, ['OWNER', 'EDITOR', 'VIEWER']);
      return linkWorkspaceRepository.listLinks(workspaceId);
   }

   async createLink(
      workspaceId: string,
      payload: CreateWorkspaceLinkRequest,
      user: SessionUser,
   ) {
      return linkWorkspaceRepository.createLink(
         workspaceId,
         payload,
         user.id,
         isAdminUser(user),
      );
   }

   async attachLink(
      workspaceId: string,
      payload: AttachWorkspaceLinkRequest,
      user: SessionUser,
   ) {
      return linkWorkspaceRepository.attachLink(
         workspaceId,
         payload.urlId,
         user.id,
         isAdminUser(user),
      );
   }

   async updateLink(
      workspaceId: string,
      linkId: string,
      payload: UpdateWorkspaceLinkRequest,
      user: SessionUser,
   ) {
      return linkWorkspaceRepository.updateLink(
         workspaceId,
         linkId,
         payload,
         user.id,
         isAdminUser(user),
      );
   }

   async deactivateLink(
      workspaceId: string,
      linkId: string,
      user: SessionUser,
   ) {
      return linkWorkspaceRepository.deactivateLink(
         workspaceId,
         linkId,
         user.id,
         isAdminUser(user),
      );
   }
}

export const linkWorkspaceService = new LinkWorkspaceService();
