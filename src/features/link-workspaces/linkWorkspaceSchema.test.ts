import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
   AddLinkWorkspaceMemberSchema,
   CreateLinkWorkspaceSchema,
   CreateWorkspaceLinkSchema,
   UpdateLinkWorkspaceSchema,
   UpdateWorkspaceLinkSchema,
} from './linkWorkspaceSchema.js';

describe('link workspace schemas', () => {
   it('only adds new members as editors or viewers', () => {
      for (const role of ['EDITOR', 'VIEWER']) {
         assert.equal(
            AddLinkWorkspaceMemberSchema.safeParse({ userId: 'user-1', role })
               .success,
            true,
         );
      }
      assert.equal(
         AddLinkWorkspaceMemberSchema.safeParse({
            userId: 'user-1',
            role: 'OWNER',
         }).success,
         false,
      );
   });

   it('rejects empty updates and server-controlled workspace fields', () => {
      assert.equal(UpdateLinkWorkspaceSchema.safeParse({}).success, false);
      assert.equal(
         CreateLinkWorkspaceSchema.safeParse({
            name: 'Comittee Links',
            createdBy: 'other-user',
         }).success,
         false,
      );
   });

   it('validates workspace link URLs and short codes', () => {
      assert.equal(
         CreateWorkspaceLinkSchema.safeParse({
            originalUrl: 'https://himti.or.id',
            shortCode: 'himti2026',
         }).success,
         true,
      );
      assert.equal(
         CreateWorkspaceLinkSchema.safeParse({
            originalUrl: 'not-a-url',
            shortCode: 'has spaces',
         }).success,
         false,
      );
   });

   it('evaluates expiration against request time', async () => {
      const expiration = new Date(Date.now() + 20).toISOString();
      await new Promise((resolve) => setTimeout(resolve, 30));

      assert.equal(
         CreateWorkspaceLinkSchema.safeParse({
            originalUrl: 'https://himti.or.id',
            shortCode: 'expiredCreate',
            expiresAt: expiration,
         }).success,
         false,
      );
      assert.equal(
         UpdateWorkspaceLinkSchema.safeParse({ expiresAt: expiration }).success,
         false,
      );
   });
});
