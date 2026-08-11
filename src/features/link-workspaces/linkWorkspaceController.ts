import { Request, Response } from 'express';
import { linkWorkspaceService } from './linkWorkspaceService.js';
import {
   AddLinkWorkspaceMemberSchema,
   AttachWorkspaceLinkSchema,
   ChangeLinkWorkspaceMemberRoleSchema,
   CreateLinkWorkspaceSchema,
   CreateWorkspaceLinkSchema,
   EmptyBodySchema,
   ListLinkWorkspacesSchema,
   UpdateLinkWorkspaceSchema,
   UpdateWorkspaceLinkSchema,
   WorkspaceIdSchema,
   WorkspaceLinkParamsSchema,
   WorkspaceMemberParamsSchema,
} from './linkWorkspaceSchema.js';

const success = (res: Response, data: unknown, status = 200) =>
   res.status(status).json({ msg: 'success', data });

export const listLinkWorkspaces = async (req: Request, res: Response) => {
   const query = ListLinkWorkspacesSchema.parse(req.query);
   const result = await linkWorkspaceService.list(query, res.locals.user);
   res.status(200).json({ msg: 'success', ...result });
};

export const createLinkWorkspace = async (req: Request, res: Response) => {
   const body = CreateLinkWorkspaceSchema.parse(req.body);
   return success(
      res,
      await linkWorkspaceService.create(body, res.locals.user),
      201,
   );
};

export const getLinkWorkspace = async (req: Request, res: Response) => {
   const { workspaceId } = WorkspaceIdSchema.parse(req.params);
   return success(
      res,
      await linkWorkspaceService.get(workspaceId, res.locals.user),
   );
};

export const updateLinkWorkspace = async (req: Request, res: Response) => {
   const { workspaceId } = WorkspaceIdSchema.parse(req.params);
   const body = UpdateLinkWorkspaceSchema.parse(req.body);
   return success(
      res,
      await linkWorkspaceService.update(workspaceId, body, res.locals.user),
   );
};

export const archiveLinkWorkspace = async (req: Request, res: Response) => {
   const { workspaceId } = WorkspaceIdSchema.parse(req.params);
   EmptyBodySchema.parse(req.body ?? {});
   return success(
      res,
      await linkWorkspaceService.archive(workspaceId, res.locals.user),
   );
};

export const listLinkWorkspaceMembers = async (req: Request, res: Response) => {
   const { workspaceId } = WorkspaceIdSchema.parse(req.params);
   return success(
      res,
      await linkWorkspaceService.listMembers(workspaceId, res.locals.user),
   );
};

export const addLinkWorkspaceMember = async (req: Request, res: Response) => {
   const { workspaceId } = WorkspaceIdSchema.parse(req.params);
   const body = AddLinkWorkspaceMemberSchema.parse(req.body);
   return success(
      res,
      await linkWorkspaceService.addMember(workspaceId, body, res.locals.user),
      201,
   );
};

export const changeLinkWorkspaceMemberRole = async (
   req: Request,
   res: Response,
) => {
   const { workspaceId, userId } = WorkspaceMemberParamsSchema.parse(
      req.params,
   );
   const body = ChangeLinkWorkspaceMemberRoleSchema.parse(req.body);
   return success(
      res,
      await linkWorkspaceService.changeMemberRole(
         workspaceId,
         userId,
         body,
         res.locals.user,
      ),
   );
};

export const removeLinkWorkspaceMember = async (
   req: Request,
   res: Response,
) => {
   const { workspaceId, userId } = WorkspaceMemberParamsSchema.parse(
      req.params,
   );
   EmptyBodySchema.parse(req.body ?? {});
   return success(
      res,
      await linkWorkspaceService.removeMember(
         workspaceId,
         userId,
         res.locals.user,
      ),
   );
};

export const listWorkspaceLinks = async (req: Request, res: Response) => {
   const { workspaceId } = WorkspaceIdSchema.parse(req.params);
   return success(
      res,
      await linkWorkspaceService.listLinks(workspaceId, res.locals.user),
   );
};

export const createWorkspaceLink = async (req: Request, res: Response) => {
   const { workspaceId } = WorkspaceIdSchema.parse(req.params);
   const body = CreateWorkspaceLinkSchema.parse(req.body);
   return success(
      res,
      await linkWorkspaceService.createLink(workspaceId, body, res.locals.user),
      201,
   );
};

export const attachWorkspaceLink = async (req: Request, res: Response) => {
   const { workspaceId } = WorkspaceIdSchema.parse(req.params);
   const body = AttachWorkspaceLinkSchema.parse(req.body);
   return success(
      res,
      await linkWorkspaceService.attachLink(workspaceId, body, res.locals.user),
      201,
   );
};

export const updateWorkspaceLink = async (req: Request, res: Response) => {
   const { workspaceId, linkId } = WorkspaceLinkParamsSchema.parse(req.params);
   const body = UpdateWorkspaceLinkSchema.parse(req.body);
   return success(
      res,
      await linkWorkspaceService.updateLink(
         workspaceId,
         linkId,
         body,
         res.locals.user,
      ),
   );
};

export const deactivateWorkspaceLink = async (req: Request, res: Response) => {
   const { workspaceId, linkId } = WorkspaceLinkParamsSchema.parse(req.params);
   EmptyBodySchema.parse(req.body ?? {});
   return success(
      res,
      await linkWorkspaceService.deactivateLink(
         workspaceId,
         linkId,
         res.locals.user,
      ),
   );
};
