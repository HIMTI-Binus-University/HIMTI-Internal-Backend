import express from 'express';
import type { Router } from 'express';
import { requireAuth } from '@/middleware/authMiddleware.js';
import { requirePermission } from '@/middleware/permissionMiddleware.js';
import {
   addLinkWorkspaceMember,
   archiveLinkWorkspace,
   attachWorkspaceLink,
   changeLinkWorkspaceMemberRole,
   createLinkWorkspace,
   createWorkspaceLink,
   deactivateWorkspaceLink,
   getLinkWorkspace,
   listLinkWorkspaceMembers,
   listLinkWorkspaces,
   listWorkspaceLinks,
   removeLinkWorkspaceMember,
   updateLinkWorkspace,
   updateWorkspaceLink,
} from './linkWorkspaceController.js';

const router: Router = express.Router();

router.use(requireAuth, requirePermission('manage_urls'));
router.get('/', listLinkWorkspaces);
router.post('/', createLinkWorkspace);
router.get('/:workspaceId', getLinkWorkspace);
router.put('/:workspaceId', updateLinkWorkspace);
router.patch('/:workspaceId/archive', archiveLinkWorkspace);
router.get('/:workspaceId/members', listLinkWorkspaceMembers);
router.post('/:workspaceId/members', addLinkWorkspaceMember);
router.patch('/:workspaceId/members/:userId', changeLinkWorkspaceMemberRole);
router.delete('/:workspaceId/members/:userId', removeLinkWorkspaceMember);
router.get('/:workspaceId/links', listWorkspaceLinks);
router.post('/:workspaceId/links', createWorkspaceLink);
router.post('/:workspaceId/links/attach', attachWorkspaceLink);
router.put('/:workspaceId/links/:linkId', updateWorkspaceLink);
router.patch('/:workspaceId/links/:linkId/deactivate', deactivateWorkspaceLink);

export default router;
