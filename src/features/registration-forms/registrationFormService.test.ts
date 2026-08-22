import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
   FormValidationSchema,
   SaveRegistrationFormDraftV1Schema,
} from './registrationFormSchema.js';
import {
   assignDraftFieldKeys,
   getDraftScopeIssue,
   validateRegistrationFormDraft,
} from './registrationFormService.js';
import { getTemporarySectionOrderOffset } from './registrationFormRepository.js';

const draft = (questions: Array<Record<string, unknown>>) =>
   SaveRegistrationFormDraftV1Schema.parse({
      revision: 1,
      name: 'Registration',
      stage: 'REGISTRATION',
      sections: [{ id: 'section-1', title: 'Details', questions }],
   });

describe('registration form Phase 4 contracts', () => {
   it('requires a positive optimistic revision and complete section ordering', () => {
      const result = SaveRegistrationFormDraftV1Schema.safeParse({
         revision: 0,
         name: 'Registration',
         stage: 'REGISTRATION',
         sections: [],
      });

      assert.equal(result.success, false);
   });

   it('rejects contradictory explicit validation metadata', () => {
      assert.equal(
         FormValidationSchema.safeParse({ minLength: 20, maxLength: 10 })
            .success,
         false,
      );
      assert.equal(
         FormValidationSchema.safeParse({ minSelections: 3, maxSelections: 2 })
            .success,
         false,
      );
   });

   it('rejects unknown validation rules instead of silently persisting them', () => {
      assert.equal(
         FormValidationSchema.safeParse({ regex: '.*' }).success,
         false,
      );
   });

   it('supports ordered date bounds and positive file count limits', () => {
      assert.equal(
         FormValidationSchema.safeParse({
            minDate: '2026-08-01',
            maxDate: '2026-08-31',
         }).success,
         true,
      );
      assert.equal(
         FormValidationSchema.safeParse({
            minDate: '2026-09-01',
            maxDate: '2026-08-31',
         }).success,
         false,
      );
      assert.equal(
         FormValidationSchema.safeParse({ maxFiles: 0 }).success,
         false,
      );
   });

   it('reports date and file metadata on incompatible field types', () => {
      const issues = validateRegistrationFormDraft(
         draft([
            {
               label: 'Name',
               fieldType: 'TEXT',
               validation: { minDate: '2026-08-01', maxFiles: 2 },
            },
         ]),
      );

      assert.deepEqual(
         issues.map((issue) => issue.path),
         [
            'sections.0.questions.0.validation.maxFiles',
            'sections.0.questions.0.validation.minDate',
         ],
      );
   });

   it('reserves every explicit field key before generating missing keys', () => {
      const sections = assignDraftFieldKeys(
         draft([
            { label: 'Email', fieldType: 'TEXT' },
            { label: 'Other', fieldKey: 'email', fieldType: 'TEXT' },
         ]),
      );

      assert.equal(sections[0].questions[0].fieldKey, 'email_2');
      assert.equal(sections[0].questions[1].fieldKey, 'email');
   });

   it('rejects cross-question option IDs while allowing question moves', () => {
      const payload = draft([
         {
            id: 'question-2',
            label: 'Choice',
            fieldType: 'SELECT',
            options: [
               { id: 'option-1', label: 'A', value: 'a' },
               { label: 'B', value: 'b' },
            ],
         },
      ]);
      const issue = getDraftScopeIssue(payload, {
         sectionIds: new Set(['section-1']),
         questionIds: new Set(['question-1', 'question-2']),
         optionQuestionIds: new Map([['option-1', 'question-1']]),
      });

      assert.deepEqual(issue, {
         code: 'INVALID_OPTION_PARENT',
         message: 'Option does not belong to the submitted question',
      });
   });

   it('moves existing section orders beyond incoming indexes before swaps', () => {
      const offset = getTemporarySectionOrderOffset(4, 5, 3);
      assert.ok(offset > 4);
      assert.ok(0 + offset > 2);
      assert.ok(4 + offset > 2);
   });

   it('rejects empty forms and checkbox bounds above active options', () => {
      const emptyIssues = validateRegistrationFormDraft({
         revision: 1,
         name: 'Empty',
         stage: 'REGISTRATION',
         sections: [],
      } as unknown as Parameters<typeof validateRegistrationFormDraft>[0]);
      assert.equal(emptyIssues[0]?.code, 'FORM_EMPTY');

      const checkboxIssues = validateRegistrationFormDraft(
         draft([
            {
               label: 'Choices',
               fieldType: 'CHECKBOX',
               validation: { maxSelections: 3 },
               options: [
                  { label: 'A', value: 'a' },
                  { label: 'B', value: 'b' },
               ],
            },
         ]),
      );
      assert.equal(
         checkboxIssues.find(
            (issue) => issue.code === 'SELECTION_LIMIT_EXCEEDS_OPTIONS',
         )?.path,
         'sections.0.questions.0.validation.maxSelections',
      );
   });
});

describe('registration form Phase 4 migration', () => {
   const migration = readFileSync(
      fileURLToPath(
         new URL(
            '../../../prisma/migrations/20260816010000_add_registration_form_builder_phase4/migration.sql',
            import.meta.url,
         ),
      ),
      'utf8',
   );

   it('is additive and protects optimistic revisions', () => {
      assert.doesNotMatch(migration, /DROP\s+(?:TABLE|COLUMN|TYPE)/i);
      assert.doesNotMatch(migration, /TRUNCATE/i);
      assert.match(
         migration,
         /ADD COLUMN "revision" INTEGER NOT NULL DEFAULT 1/,
      );
      assert.match(migration, /registration_forms_revision_check/);
      assert.match(migration, /ADD COLUMN "validation" JSONB NOT NULL/);
      assert.match(
         migration,
         /registration_forms_one_published_logical_version_idx[\s\S]*WHERE "status" = 'PUBLISHED'/,
      );
      assert.match(
         migration,
         /form_questions_active_field_key_idx[\s\S]*WHERE "status" = 'ACTIVE'/,
      );
   });
});

describe('registration form Phase 4 concurrency invariants', () => {
   const serviceSource = readFileSync(
      fileURLToPath(new URL('./registrationFormService.ts', import.meta.url)),
      'utf8',
   );
   const repositorySource = readFileSync(
      fileURLToPath(
         new URL('./registrationFormRepository.ts', import.meta.url),
      ),
      'utf8',
   );

   it('blocks every legacy child mutation helper for versioned forms', () => {
      assert.match(serviceSource, /logicalKey !== null/);
      assert.match(serviceSource, /VERSIONED_FORM_REQUIRES_V1/);
      assert.match(
         serviceSource,
         /assertFormCanBeEdited\([\s\S]*question\.form\.logicalKey/,
      );
      assert.match(
         serviceSource,
         /assertFormCanBeEdited\([\s\S]*option\.question\.form\.logicalKey/,
      );
   });

   it('uses status and revision compare-and-swap for lifecycle transitions', () => {
      assert.match(
         repositorySource,
         /where:\s*\{[\s\S]*id,[\s\S]*status: expectedStatus,[\s\S]*revision: expectedRevision/,
      );
      assert.match(repositorySource, /TransactionIsolationLevel\.Serializable/);
      assert.match(repositorySource, /LIFECYCLE_CONFLICT/);
   });

   it('publishes registration defaults and independently clones assignment snapshots atomically', () => {
      assert.match(repositorySource, /form\.stage === 'REGISTRATION'/);
      assert.match(repositorySource, /audience: 'EACH_ATTENDEE'/);
      assert.match(repositorySource, /assignmentCount === 0/);
      assert.match(
         repositorySource,
         /sections: \{[\s\S]*\},\s*assignments: \{\s*create: source\.assignments\.map/,
      );
      assert.match(
         repositorySource,
         /ticketPackageId:\s*assignment\.ticketPackageId/,
      );
      assert.match(repositorySource, /opensAt: assignment\.opensAt/);
      assert.match(repositorySource, /closesAt: assignment\.closesAt/);
      assert.match(repositorySource, /logicalKey: randomUUID\(\)/);
      assert.match(repositorySource, /version: 1/);
      assert.match(repositorySource, /supersedesId: null/);
   });

   it('soft-deletes only an unchanged draft and hides deleted current forms', () => {
      assert.match(
         repositorySource,
         /status: 'DRAFT',[\s\S]*revision: expectedRevision,[\s\S]*deletedAt: null/,
      );
      assert.match(repositorySource, /deletedBy: userId/);
      assert.match(repositorySource, /revision: \{ increment: 1 \}/);
      assert.match(
         repositorySource,
         /findFormsBySubEventId[\s\S]*deletedAt: null/,
      );
      assert.match(
         repositorySource,
         /findPublishedVersion[\s\S]*deletedAt: null/,
      );
   });

   it('revalidates child scope inside the complete-save transaction', () => {
      assert.match(repositorySource, /Draft child scope changed during save/);
      assert.match(
         repositorySource,
         /where:\s*\{[\s\S]*id: question\.id,[\s\S]*registrationFormId: formId,[\s\S]*\}/,
      );
      assert.match(repositorySource, /formQuestionId: savedQuestion\.id/);
   });

   it('only exposes published forms under browseable registration parents', () => {
      assert.match(repositorySource, /registrationMode: \{ not: 'DISABLED' \}/);
      assert.match(repositorySource, /event: \{ status: 'PUBLISHED' \}/);
      assert.match(repositorySource, /subEvent:\s*\{[\s\S]*status: 'OPEN'/);
      assert.doesNotMatch(
         repositorySource.slice(
            repositorySource.indexOf('async findPublishedVersion'),
            repositorySource.indexOf('async createBuilderForm'),
         ),
         /visibility/,
      );
   });
});
