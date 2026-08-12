import {
   LinkWorkspaceRole,
   LinkWorkspaceStatus,
   Prisma,
   Status,
} from '@prisma/client';
import { prisma } from '@/config/prisma.js';
import { AppError } from '@/utils/appError.js';
import {
   getMemberRoleChangeAction,
   getPersonalUrlAttachmentError,
} from './linkWorkspacePolicy.js';
import type {
   CreateWorkspaceLinkRequest,
   ListLinkWorkspacesQuery,
   UpdateWorkspaceLinkRequest,
} from './linkWorkspaceTypes.js';

const memberUserSelect = {
   id: true,
   name: true,
   email: true,
   status: true,
} satisfies Prisma.UserSelect;

const workspaceInclude = {
   members: {
      include: { user: { select: memberUserSelect } },
      orderBy: { createdAt: 'asc' as const },
   },
   _count: { select: { links: true } },
} satisfies Prisma.LinkWorkspaceInclude;

const workspaceLinkInclude = {
   url: true,
   creator: { select: { id: true, name: true } },
} satisfies Prisma.LinkWorkspaceLinkInclude;

class LinkWorkspaceRepository {
   private async assertNameAvailable(
      tx: Prisma.TransactionClient,
      name: string,
      excludeId?: string,
   ) {
      const duplicate = await tx.$queryRaw<Array<{ id: string }>>`
         SELECT "id"
         FROM "link_workspaces"
         WHERE LOWER("name") = LOWER(${name})
         ${excludeId ? Prisma.sql`AND "id" <> ${excludeId}` : Prisma.empty}
         LIMIT 1
      `;
      if (duplicate.length) {
         throw new AppError('A workspace with this name already exists', 409);
      }
   }

   private async authorizeMutation(
      tx: Prisma.TransactionClient,
      workspaceId: string,
      actorId: string,
      isAdmin: boolean,
      roles: LinkWorkspaceRole[],
   ) {
      const workspace = await tx.linkWorkspace.findUnique({
         where: { id: workspaceId },
         select: {
            status: true,
            ...(!isAdmin && {
               members: {
                  where: { userId: actorId },
                  select: { role: true },
               },
            }),
         },
      });
      if (!workspace) throw new AppError('Link workspace not found', 404);
      if (workspace.status !== 'ACTIVE') {
         throw new AppError('Link workspace is archived', 409);
      }
      if (
         !isAdmin &&
         (!('members' in workspace) ||
            !workspace.members.some((member) => roles.includes(member.role)))
      ) {
         throw new AppError(
            'You are not allowed to access this workspace',
            403,
         );
      }
   }

   async create(
      name: string,
      description: string | null | undefined,
      userId: string,
   ) {
      return prisma.$transaction(async (tx) => {
         await this.assertNameAvailable(tx, name);
         return tx.linkWorkspace.create({
            data: {
               name,
               description,
               createdBy: userId,
               members: { create: { userId, role: 'OWNER' } },
            },
            include: workspaceInclude,
         });
      });
   }

   async findAll(
      query: ListLinkWorkspacesQuery,
      userId: string,
      isAdmin: boolean,
   ) {
      const where: Prisma.LinkWorkspaceWhereInput = {
         status: query.status,
         ...(!isAdmin && { members: { some: { userId } } }),
         ...(query.search && {
            OR: [
               { name: { contains: query.search, mode: 'insensitive' } },
               { description: { contains: query.search, mode: 'insensitive' } },
            ],
         }),
      };
      const skip = (query.page - 1) * query.limit;
      const [data, total] = await prisma.$transaction([
         prisma.linkWorkspace.findMany({
            where,
            include: workspaceInclude,
            orderBy: { createdAt: 'desc' },
            skip,
            take: query.limit,
         }),
         prisma.linkWorkspace.count({ where }),
      ]);
      return { data, total };
   }

   async findById(id: string) {
      return prisma.linkWorkspace.findUnique({
         where: { id },
         include: workspaceInclude,
      });
   }

   async findMembership(workspaceId: string, userId: string) {
      return prisma.linkWorkspaceMember.findUnique({
         where: { workspaceId_userId: { workspaceId, userId } },
      });
   }

   async update(
      id: string,
      data: { name?: string; description?: string | null },
      userId: string,
      isAdmin: boolean,
   ) {
      return prisma.$transaction(
         async (tx) => {
            await this.authorizeMutation(tx, id, userId, isAdmin, ['OWNER']);
            if (data.name !== undefined) {
               await this.assertNameAvailable(tx, data.name, id);
            }
            return tx.linkWorkspace.update({
               where: { id },
               data: { ...data, updatedBy: userId },
               include: workspaceInclude,
            });
         },
         { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
   }

   async setStatus(
      id: string,
      status: LinkWorkspaceStatus,
      userId: string,
      isAdmin: boolean,
   ) {
      return prisma.$transaction(
         async (tx) => {
            await this.authorizeMutation(tx, id, userId, isAdmin, ['OWNER']);
            return tx.linkWorkspace.update({
               where: { id },
               data: { status, updatedBy: userId },
               include: workspaceInclude,
            });
         },
         { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
   }

   async findActiveUser(userId: string) {
      return prisma.user.findFirst({
         where: { id: userId, status: 'ACTIVE' },
         select: memberUserSelect,
      });
   }

   async listMembers(workspaceId: string) {
      return prisma.linkWorkspaceMember.findMany({
         where: { workspaceId },
         include: { user: { select: memberUserSelect } },
         orderBy: { createdAt: 'asc' },
      });
   }

   async addMember(
      workspaceId: string,
      userId: string,
      role: Exclude<LinkWorkspaceRole, 'OWNER'>,
      actorId: string,
      isAdmin: boolean,
   ) {
      return prisma.$transaction(
         async (tx) => {
            await this.authorizeMutation(tx, workspaceId, actorId, isAdmin, [
               'OWNER',
            ]);
            const target = await tx.user.findFirst({
               where: { id: userId, status: 'ACTIVE' },
               select: { id: true },
            });
            if (!target) throw new AppError('Active user not found', 404);
            return tx.linkWorkspaceMember.create({
               data: { workspaceId, userId, role },
               include: { user: { select: memberUserSelect } },
            });
         },
         { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
   }

   async changeMemberRole(
      workspaceId: string,
      userId: string,
      role: LinkWorkspaceRole,
      actorId: string,
      isAdmin: boolean,
   ) {
      return prisma.$transaction(
         async (tx) => {
            await this.authorizeMutation(tx, workspaceId, actorId, isAdmin, [
               'OWNER',
            ]);
            const member = await tx.linkWorkspaceMember.findUnique({
               where: { workspaceId_userId: { workspaceId, userId } },
            });
            if (!member) return null;
            const action = getMemberRoleChangeAction(
               member.role,
               role,
               userId === actorId,
            );
            if (action === 'SELF_ROLE_CHANGE' || action === 'LAST_OWNER') {
               return action;
            }
            if (action === 'TRANSFER_OWNERSHIP') {
               await tx.linkWorkspaceMember.updateMany({
                  where: { workspaceId, role: 'OWNER' },
                  data: { role: 'EDITOR' },
               });
            }
            return tx.linkWorkspaceMember.update({
               where: { workspaceId_userId: { workspaceId, userId } },
               data: { role },
               include: { user: { select: memberUserSelect } },
            });
         },
         { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
   }

   async removeMember(
      workspaceId: string,
      userId: string,
      actorId: string,
      isAdmin: boolean,
   ) {
      return prisma.$transaction(
         async (tx) => {
            await this.authorizeMutation(tx, workspaceId, actorId, isAdmin, [
               'OWNER',
            ]);
            const member = await tx.linkWorkspaceMember.findUnique({
               where: { workspaceId_userId: { workspaceId, userId } },
            });
            if (!member) return null;
            if (member.role === 'OWNER') {
               const owners = await tx.linkWorkspaceMember.count({
                  where: { workspaceId, role: 'OWNER' },
               });
               if (owners <= 1) return 'LAST_OWNER' as const;
            }
            return tx.linkWorkspaceMember.delete({
               where: { workspaceId_userId: { workspaceId, userId } },
               include: { user: { select: memberUserSelect } },
            });
         },
         { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
   }

   async listLinks(workspaceId: string, status: Status = 'ACTIVE') {
      return prisma.linkWorkspaceLink.findMany({
         where: { workspaceId, status },
         include: workspaceLinkInclude,
         orderBy: { createdAt: 'desc' },
      });
   }

   async findLink(workspaceId: string, linkId: string) {
      return prisma.linkWorkspaceLink.findFirst({
         where: { id: linkId, workspaceId },
         include: workspaceLinkInclude,
      });
   }

   async createLink(
      workspaceId: string,
      payload: CreateWorkspaceLinkRequest,
      userId: string,
      isAdmin: boolean,
   ) {
      return prisma.$transaction(
         async (tx) => {
            await this.authorizeMutation(tx, workspaceId, userId, isAdmin, [
               'OWNER',
               'EDITOR',
            ]);
            return tx.linkWorkspaceLink.create({
               data: {
                  workspace: { connect: { id: workspaceId } },
                  creator: { connect: { id: userId } },
                  url: {
                     create: {
                        originalUrl: payload.originalUrl,
                        shortCode: payload.shortCode,
                        expiresAt: payload.expiresAt ?? null,
                        creator: { connect: { id: userId } },
                     },
                  },
               },
               include: workspaceLinkInclude,
            });
         },
         { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
   }

   async attachLink(
      workspaceId: string,
      urlId: string,
      userId: string,
      isAdmin: boolean,
   ) {
      return prisma.$transaction(
         async (tx) => {
            await this.authorizeMutation(tx, workspaceId, userId, isAdmin, [
               'OWNER',
               'EDITOR',
            ]);
            const url = await tx.url.findFirst({
               where: { id: urlId, workspaceLink: null },
            });
            if (!url) throw new AppError('Personal URL not found', 404);
            const attachmentError = getPersonalUrlAttachmentError(
               url,
               userId,
               isAdmin,
            );
            if (attachmentError === 'INACTIVE') {
               throw new AppError(
                  'Inactive personal URL cannot be attached',
                  409,
               );
            }
            if (attachmentError === 'FORBIDDEN') {
               throw new AppError(
                  'You are not allowed to attach this URL',
                  403,
               );
            }
            return tx.linkWorkspaceLink.create({
               data: { workspaceId, urlId, createdBy: userId },
               include: workspaceLinkInclude,
            });
         },
         { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
   }

   async updateLink(
      workspaceId: string,
      linkId: string,
      payload: UpdateWorkspaceLinkRequest,
      userId: string,
      isAdmin: boolean,
   ) {
      const urlData: Prisma.UrlUpdateInput = {
         ...(payload.originalUrl !== undefined && {
            originalUrl: payload.originalUrl,
         }),
         ...(payload.shortCode !== undefined && {
            shortCode: payload.shortCode,
         }),
         ...(payload.expiresAt !== undefined && {
            expiresAt: payload.expiresAt,
         }),
         updater: { connect: { id: userId } },
      };
      return prisma.$transaction(
         async (tx) => {
            await this.authorizeMutation(tx, workspaceId, userId, isAdmin, [
               'OWNER',
               'EDITOR',
            ]);
            const link = await tx.linkWorkspaceLink.findFirst({
               where: { id: linkId, workspaceId },
               select: { id: true },
            });
            if (!link) throw new AppError('Workspace link not found', 404);
            return tx.linkWorkspaceLink.update({
               where: { id: linkId },
               data: {
                  updater: { connect: { id: userId } },
                  url: { update: urlData },
               },
               include: workspaceLinkInclude,
            });
         },
         { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
   }

   async deactivateLink(
      workspaceId: string,
      linkId: string,
      userId: string,
      isAdmin: boolean,
   ) {
      return prisma.$transaction(
         async (tx) => {
            await this.authorizeMutation(tx, workspaceId, userId, isAdmin, [
               'OWNER',
               'EDITOR',
            ]);
            const link = await tx.linkWorkspaceLink.findFirst({
               where: { id: linkId, workspaceId },
               select: { id: true },
            });
            if (!link) throw new AppError('Workspace link not found', 404);
            return tx.linkWorkspaceLink.update({
               where: { id: linkId },
               data: {
                  status: Status.INACTIVE,
                  updater: { connect: { id: userId } },
                  url: {
                     update: {
                        status: Status.INACTIVE,
                        updater: { connect: { id: userId } },
                     },
                  },
               },
               include: workspaceLinkInclude,
            });
         },
         { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
   }
}

export const linkWorkspaceRepository = new LinkWorkspaceRepository();
