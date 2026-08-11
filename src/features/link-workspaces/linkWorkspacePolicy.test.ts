import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
   canEditWorkspaceLinks,
   canManageWorkspace,
   canReadWorkspace,
   canResolveWorkspaceLink,
   getMemberRoleChangeAction,
   getPersonalUrlAttachmentError,
   redactWorkspaceMemberDetails,
} from './linkWorkspacePolicy.js';

describe('link workspace role policy', () => {
   it('allows every workspace role to read', () => {
      assert.equal(canReadWorkspace('OWNER'), true);
      assert.equal(canReadWorkspace('EDITOR'), true);
      assert.equal(canReadWorkspace('VIEWER'), true);
   });

   it('allows only owners and editors to mutate links', () => {
      assert.equal(canEditWorkspaceLinks('OWNER'), true);
      assert.equal(canEditWorkspaceLinks('EDITOR'), true);
      assert.equal(canEditWorkspaceLinks('VIEWER'), false);
   });

   it('allows only owners to manage workspaces and members', () => {
      assert.equal(canManageWorkspace('OWNER'), true);
      assert.equal(canManageWorkspace('EDITOR'), false);
      assert.equal(canManageWorkspace('VIEWER'), false);
   });

   it('plans ownership transfer by promoting a different non-owner', () => {
      assert.equal(
         getMemberRoleChangeAction('EDITOR', 'OWNER', false),
         'TRANSFER_OWNERSHIP',
      );
      assert.equal(
         getMemberRoleChangeAction('VIEWER', 'OWNER', false),
         'TRANSFER_OWNERSHIP',
      );
   });

   it('rejects self role changes before considering the requested role', () => {
      assert.equal(
         getMemberRoleChangeAction('OWNER', 'OWNER', true),
         'SELF_ROLE_CHANGE',
      );
      assert.equal(
         getMemberRoleChangeAction('EDITOR', 'VIEWER', true),
         'SELF_ROLE_CHANGE',
      );
   });

   it('rejects directly demoting the sole owner', () => {
      assert.equal(
         getMemberRoleChangeAction('OWNER', 'EDITOR', false),
         'LAST_OWNER',
      );
   });

   it('keeps active links resolvable when their workspace is archived', () => {
      assert.equal(canResolveWorkspaceLink(null), true);
      assert.equal(
         canResolveWorkspaceLink({
            status: 'ACTIVE',
         }),
         true,
      );
      assert.equal(
         canResolveWorkspaceLink({
            status: 'INACTIVE',
         }),
         false,
      );
   });

   it('redacts member contact and status data from non-owner responses', () => {
      const workspace = {
         members: [
            {
               userId: 'viewer',
               role: 'VIEWER' as const,
               user: {
                  id: 'viewer',
                  name: 'Viewer',
                  email: 'viewer@example.com',
                  status: 'ACTIVE',
               },
            },
         ],
      };

      const redacted = redactWorkspaceMemberDetails(workspace, 'viewer', false);
      assert.deepEqual(redacted.members[0]?.user, {
         id: 'viewer',
         name: 'Viewer',
      });
      assert.equal(
         redactWorkspaceMemberDetails(workspace, 'viewer', true),
         workspace,
      );
   });

   it('rejects inactive or unowned personal URL attachments', () => {
      assert.equal(
         getPersonalUrlAttachmentError(
            { status: 'INACTIVE', createdBy: 'actor' },
            'actor',
            false,
         ),
         'INACTIVE',
      );
      assert.equal(
         getPersonalUrlAttachmentError(
            { status: 'ACTIVE', createdBy: 'other' },
            'actor',
            false,
         ),
         'FORBIDDEN',
      );
      assert.equal(
         getPersonalUrlAttachmentError(
            { status: 'ACTIVE', createdBy: 'other' },
            'actor',
            true,
         ),
         null,
      );
   });
});
