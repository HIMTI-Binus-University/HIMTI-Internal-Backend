import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const source = (path: string) =>
   readFileSync(fileURLToPath(new URL(path, import.meta.url)), 'utf8');

describe('fixed event package invariants', () => {
   it('protects management with permission and event object scope', () => {
      assert.match(
         source('./eventPackageRoutes.ts'),
         /requirePermission\('manage_events'\)/,
      );
      assert.match(
         source('./eventPackageService.ts'),
         /assertEventCommitteeMemberOrAdmin/,
      );
   });
   it('uses revision CAS and freezes referenced commercial fields', () => {
      assert.match(
         source('./eventPackageRepository.ts'),
         /revision: \{ increment: 1 \}/,
      );
      assert.match(source('./eventPackageService.ts'), /PACKAGE_IMMUTABLE/);
      assert.match(source('./eventPackageService.ts'), /dependentOrderCount/);
   });
});
