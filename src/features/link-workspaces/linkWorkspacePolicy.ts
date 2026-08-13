import { LinkWorkspaceRole, Status } from '@prisma/client';

export const canReadWorkspace = (role: LinkWorkspaceRole) =>
   ['OWNER', 'EDITOR', 'VIEWER'].includes(role);

export const canEditWorkspaceLinks = (role: LinkWorkspaceRole) =>
   role === 'OWNER' || role === 'EDITOR';

export const canManageWorkspace = (role: LinkWorkspaceRole) => role === 'OWNER';

export const getMemberRoleChangeAction = (
   currentRole: LinkWorkspaceRole,
   nextRole: LinkWorkspaceRole,
   isSelfChange: boolean,
) => {
   if (isSelfChange) return 'SELF_ROLE_CHANGE' as const;
   if (currentRole === 'OWNER' && nextRole !== 'OWNER') {
      return 'LAST_OWNER' as const;
   }
   if (currentRole !== 'OWNER' && nextRole === 'OWNER') {
      return 'TRANSFER_OWNERSHIP' as const;
   }
   return 'UPDATE_ROLE' as const;
};

export const canResolveWorkspaceLink = (
   workspaceLink: { status: Status } | null,
) => workspaceLink === null || workspaceLink.status === 'ACTIVE';

type WorkspaceWithMembers = {
   members: Array<{
      userId: string;
      role: LinkWorkspaceRole;
      user: { id: string; name: string; email?: string; status?: string };
   }>;
};

export const redactWorkspaceMemberDetails = <T extends WorkspaceWithMembers>(
   workspace: T,
   requesterId: string,
   isAdmin: boolean,
) => {
   const requesterRole = workspace.members.find(
      (member) => member.userId === requesterId,
   )?.role;
   if (isAdmin || requesterRole === 'OWNER') return workspace;

   return {
      ...workspace,
      members: workspace.members.map((member) => ({
         ...member,
         user: { id: member.user.id, name: member.user.name },
      })),
   };
};

export const getPersonalUrlAttachmentError = (
   url: { status: Status; createdBy: string },
   actorId: string,
   isAdmin: boolean,
) => {
   if (url.status !== 'ACTIVE') return 'INACTIVE' as const;
   if (!isAdmin && url.createdBy !== actorId) return 'FORBIDDEN' as const;
   return null;
};
