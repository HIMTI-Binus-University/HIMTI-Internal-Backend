import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
   BulkImportResourcesSchema,
   BulkImportSoftwareSchema,
} from './himtiKitSchema.js';
import { ResourceService, SoftwareService } from './himtiKitService.js';
import type { ResourceRepository, SoftwareRepository } from './himtiKitRepository.js';

// Rows taken from learning_materials.csv / software.csv (old Kit DB export).
const calculus = {
   title: 'Calculus',
   description: 'Rangkuman matakuliah Calculus',
   downloadUrl: 'https://drive.google.com/file/d/1TDec2UFTI0PftPXWbU7oGKPb3epRk3wP/view?usp=sharing',
   coverImageUrl: 'https://anugerahhimtikit.sirv.com/Images/drive-download-20260907T140955Z-1-001/CALCULUS.png',
   majors: ['COMPUTER_SCIENCE', 'DATA_SCIENCE', 'DIGITAL_PSYCHOLOGY'],
};
const gameDesign = {
   title: 'Game Design',
   description: 'Rangkuman matakuliah Game Design',
   downloadUrl: 'https://drive.google.com/file/d/1G4LOnCDnltlZkVyA8fiHAYhR3HVOauPW/view?usp=sharing',
   coverImageUrl: null,
   majors: ['GAME_APPLICATION_AND_TECHNOLOGY'],
};
const guidebook = {
   name: 'Software Guidebook',
   description: 'Semua link yang diperlukan ada di dokumen pdf',
   downloadUrl: 'https://drive.google.com/file/d/1BEg8o83Jb21RjdZeW-7T5p-16f7_8CGR/view?usp=sharing',
   coverImageUrl: 'https://anugerahhimtikit.sirv.com/Images/drive-download-20260907T140955Z-1-001/SOFTWARE%20LIST.png',
};

const issueFields = (result: { success: boolean; error?: { issues: { path: PropertyKey[] }[] } }) =>
   result.success ? [] : result.error!.issues.map((issue) => issue.path.map(String).join('.'));

describe('HIMTI Kit bulk import schemas', () => {
   it('accepts valid resource rows and keeps every major', () => {
      const parsed = BulkImportResourcesSchema.parse({ resources: [calculus, gameDesign] });
      assert.deepEqual(parsed.resources[0].majors, calculus.majors);
      assert.equal(parsed.resources[1].coverImageUrl, null);
   });

   it('reports invalid rows by index and field', () => {
      const result = BulkImportResourcesSchema.safeParse({
         resources: [
            calculus,
            { ...gameDesign, title: '', majors: ['NOT_A_MAJOR'] },
            { ...gameDesign, title: 'X', downloadUrl: 'ftp://x', majors: [] },
         ],
      });
      assert.equal(result.success, false);
      const fields = issueFields(result);
      assert.ok(fields.includes('resources.1.title'));
      assert.ok(fields.includes('resources.1.majors.0'));
      assert.ok(fields.includes('resources.2.downloadUrl'));
      assert.ok(fields.includes('resources.2.majors'));
      assert.ok(!fields.some((field) => field.startsWith('resources.0')));
   });

   it('rejects titles repeated inside the payload, case-insensitively', () => {
      const result = BulkImportResourcesSchema.safeParse({
         resources: [calculus, { ...calculus, title: ' calculus ' }],
      });
      assert.deepEqual(issueFields(result), ['resources.1.title']);
   });

   it('validates software rows and rejects repeated names', () => {
      assert.equal(BulkImportSoftwareSchema.safeParse({ software: [guidebook] }).success, true);
      const missing = BulkImportSoftwareSchema.safeParse({ software: [{ ...guidebook, description: '' }] });
      assert.deepEqual(issueFields(missing), ['software.0.description']);
      const dupes = BulkImportSoftwareSchema.safeParse({ software: [guidebook, guidebook] });
      assert.deepEqual(issueFields(dupes), ['software.1.name']);
   });

   it('rejects an empty payload', () => {
      assert.equal(BulkImportResourcesSchema.safeParse({ resources: [] }).success, false);
      assert.equal(BulkImportSoftwareSchema.safeParse({ software: [] }).success, false);
   });
});

describe('HIMTI Kit bulk import services', () => {
   it('creates new resources in one batch and skips titles that already exist', async () => {
      let saved: unknown[] = [];
      const repo = {
         findTitles: async () => ['CALCULUS'],
         createMany: async (rows: unknown[]) => { saved = rows; return rows.length; },
      } as unknown as ResourceRepository;
      const input = BulkImportResourcesSchema.parse({ resources: [calculus, gameDesign] });
      const result = await new ResourceService(repo).bulkImportResources(input);
      assert.deepEqual(result, {
         totalSubmitted: 2,
         totalCreated: 1,
         totalSkipped: 1,
         skipped: [{ row: 1, key: 'Calculus', reason: 'Already exists' }],
      });
      assert.equal(saved.length, 1);
      assert.equal((saved[0] as { title: string }).title, 'Game Design');
      assert.ok((saved[0] as { id: string }).id);
   });

   it('does not write when every software row already exists', async () => {
      let called = false;
      const repo = {
         findNames: async () => ['Software Guidebook'],
         createMany: async () => { called = true; return 0; },
      } as unknown as SoftwareRepository;
      const input = BulkImportSoftwareSchema.parse({ software: [guidebook] });
      const result = await new SoftwareService(repo).bulkImportSoftware(input);
      assert.equal(called, false);
      assert.equal(result.totalCreated, 0);
      assert.equal(result.totalSkipped, 1);
   });

   it('returns majors and the legacy major field on resource responses', async () => {
      const row = { id: 'r1', ...calculus, createdAt: new Date(), updatedAt: null };
      const repo = { findById: async () => row } as unknown as ResourceRepository;
      const resource = await new ResourceService(repo).getResourceById('r1');
      assert.deepEqual(resource.majors, calculus.majors);
      assert.equal(resource.major, 'COMPUTER_SCIENCE');
   });
});
