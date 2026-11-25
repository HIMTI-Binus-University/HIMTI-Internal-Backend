import { getSchema } from '@tiptap/core';
import { MarkdownManager } from '@tiptap/markdown';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Mathematics from '@tiptap/extension-mathematics';
import { TableKit } from '@tiptap/extension-table';
import { TiptapTransformer } from '@hocuspocus/transformer';
import { applyUpdate, encodeStateAsUpdate, type Doc } from 'yjs';
import type { Prisma, ResponsiStatus } from '@prisma/client';
import { AppError } from '@/utils/appError.js';
import { publicDocument } from '@/features/public-education/publicEducationService.js';
import { educationRepository as repo } from './educationRepository.js';
import { summaryPermissions } from './educationTypes.js';
import type {
   SummaryActor,
   CourseGroupList,
   CreateCourseGroup,
   CreateResponsi,
   ResponsiListQuery,
   UpdateCourseGroup,
   UpdateResponsi,
} from './educationTypes.js';

function assertPublicDocument(content: string) {
   try {
      publicDocument(content);
   } catch {
      throw new AppError(
         'Summary Markdown cannot be published as a public document',
         400,
      );
   }
}

const collaborationExtensions = [
   StarterKit.configure({ undoRedo: false, trailingNode: false }),
   Image,
   Mathematics,
   TableKit,
];
const collaborationSchema = getSchema(collaborationExtensions);
const collaborationMarkdown = new MarkdownManager({
   extensions: collaborationExtensions,
});

export function parseCollaborationRoom(name: string) {
   const match = /^([A-Za-z0-9_-]{1,128}):([0-9]{1,10})$/.exec(name);
   if (!match) throw new AppError('Invalid summary room', 400);
   return { id: match[1]!, revision: Number(match[2]) };
}

class EducationService {
   private collaborationDocuments?: ReadonlyMap<string, Doc>;

   useCollaborationDocuments(documents: ReadonlyMap<string, Doc>) {
      this.collaborationDocuments = documents;
   }

   private readCollaborationMarkdown(document: Doc) {
      const json = TiptapTransformer.fromYdoc(document, 'default');
      collaborationSchema.nodeFromJSON(json).check();
      return collaborationMarkdown.serialize(json);
   }

   private requireStoredCollaboration(row: {
      id: string;
      collaborationRevision: number;
      content: string;
   }) {
      const active = this.collaborationDocuments?.get(
         row.id + ':' + row.collaborationRevision,
      );
      if (active && this.readCollaborationMarkdown(active) !== row.content) {
         throw new AppError(
            'Live edits are still saving. Try again in a moment.',
            409,
         );
      }
   }

   async summaryActor(id: string): Promise<SummaryActor> {
      const permissions = await repo.getSummaryPermissions(id);
      if (
         !Object.values(summaryPermissions).some((name) =>
            permissions.has(name),
         )
      ) {
         throw new AppError('Education summary permission required', 403);
      }
      return { id, permissions };
   }

   private requireSummaryPermission(actor: SummaryActor, permission: string) {
      if (
         !actor.permissions.has(summaryPermissions.legacy) &&
         !actor.permissions.has(permission)
      ) {
         throw new AppError('Education summary permission required', 403);
      }
   }

   private requireAssignedEditor(
      actor: SummaryActor,
      editors: { userId: string }[],
   ) {
      this.requireSummaryPermission(actor, summaryPermissions.edit);
      if (
         !actor.permissions.has(summaryPermissions.legacy) &&
         !editors.some(({ userId }) => userId === actor.id)
      ) {
         throw new AppError('You are not assigned to edit this summary', 403);
      }
   }

   async authorizeCollaboration(name: string, actor: SummaryActor) {
      const { id, revision } = parseCollaborationRoom(name);
      const row = await repo.findCollaborationDocument(id);
      if (
         !row ||
         row.collaborationRevision !== revision ||
         (row.status !== 'DRAFT' && row.status !== 'UNDER_REVIEW')
      ) {
         throw new AppError('Reload the summary to continue editing', 409);
      }
      this.requireAssignedEditor(actor, row.editors);
      return row;
   }

   async loadCollaboration(name: string, actor: SummaryActor, document: Doc) {
      const row = await this.authorizeCollaboration(name, actor);
      if (row.collaborationState) {
         applyUpdate(document, row.collaborationState);
         return;
      }

      const parsed = collaborationMarkdown.parse(row.content);
      const initial = parsed.content?.length
         ? parsed
         : { type: 'doc', content: [{ type: 'paragraph' }] };
      const seed = TiptapTransformer.toYdoc(
         initial,
         'default',
         collaborationExtensions,
      );
      try {
         applyUpdate(document, encodeStateAsUpdate(seed));
      } finally {
         seed.destroy();
      }
   }

   async storeCollaboration(name: string, document: Doc) {
      const { id, revision } = parseCollaborationRoom(name);
      const markdown = this.readCollaborationMarkdown(document);
      const state = encodeStateAsUpdate(document);
      if (
         Buffer.byteLength(markdown) > 256 * 1024 ||
         state.byteLength > 4 * 1024 * 1024
      ) {
         throw new AppError(
            'Summary exceeds the collaboration size limit',
            400,
         );
      }
      await repo.storeCollaborationDocument(
         id,
         revision,
         new Uint8Array(state),
         markdown,
      );
   }

   // Course Groups
   listCourseGroups(query: CourseGroupList) {
      return repo.listCourseGroups(query);
   }

   async getCourseGroupById(id: string) {
      const course = await repo.findCourseGroupById(id);
      if (!course) {
         throw new AppError('Course group not found', 404);
      }
      return course;
   }

   createCourseGroup(data: CreateCourseGroup) {
      return repo.createCourseGroup(data);
   }

   async updateCourseGroup(id: string, data: UpdateCourseGroup) {
      await this.getCourseGroupById(id);
      return repo.updateCourseGroup(id, data);
   }

   // Responsi Helpers
   private async resolveCourseId(
      courseIdentifier: string,
      actor: SummaryActor,
   ) {
      let course = await repo.findCourseGroupById(courseIdentifier);
      if (!course) {
         course = await repo.findCourseGroupByName(courseIdentifier);
      }
      if (!course) {
         this.requireSummaryPermission(actor, summaryPermissions.legacy);
         // Legacy Education clients can create a course by name.
         course = await repo.createCourseGroup({ name: courseIdentifier });
      }
      return course.id;
   }

   private formatResponsi(row: {
      id: string;
      title: string;
      summaryType: string;
      academicPeriod: string;
      semester: number | null;
      examType: string;
      status: ResponsiStatus;
      pic: string;
      content: string;
      createdAt: Date;
      updatedAt: Date | null;
      course: { id: string; name: string; code: string | null };
      editors?: { userId: string; user: { name: string } }[];
      approvedById?: string | null;
      collaborationRevision?: number;
   }) {
      return {
         id: row.id,
         title: row.title,
         summaryType: row.summaryType,
         course: row.course.name,
         courseId: row.course.id,
         academicPeriod: row.academicPeriod,
         semester: row.semester,
         examType: row.examType,
         pic: row.pic,
         status: row.status,
         content: row.content,
         editorIds: row.editors?.map(({ userId }) => userId),
         editors: row.editors?.map(({ userId, user }) => ({
            id: userId,
            name: user.name,
         })),
         approvedById: row.approvedById,
         collaborationRevision: row.collaborationRevision,
         lastUpdated: (row.updatedAt ?? row.createdAt).toISOString(),
         createdAt: row.createdAt.toISOString(),
      };
   }

   // Responsi
   async listResponsies(query: ResponsiListQuery) {
      const page = query.page ?? 1;
      const limit = query.limit ?? 50;
      const skip = (page - 1) * limit;

      const where: Prisma.ResponsiWhereInput = {};
      if (query.summaryType) where.summaryType = query.summaryType;

      if (query.status) {
         where.status = query.status as ResponsiStatus;
      }
      if (query.academicPeriod) {
         where.academicPeriod = query.academicPeriod;
      }
      if (query.examType) {
         where.examType = query.examType;
      }
      if (query.course) {
         where.OR = [
            { courseId: query.course },
            { course: { name: { equals: query.course, mode: 'insensitive' } } },
         ];
      }
      if (query.search) {
         where.AND = [
            {
               OR: [
                  { title: { contains: query.search, mode: 'insensitive' } },
                  { pic: { contains: query.search, mode: 'insensitive' } },
                  {
                     course: {
                        name: { contains: query.search, mode: 'insensitive' },
                     },
                  },
               ],
            },
         ];
      }

      const [total, rows] = await Promise.all([
         repo.countResponsies(where),
         repo.listResponsies(where, skip, limit),
      ]);

      const data = rows.map((r) => this.formatResponsi(r));

      return {
         data,
         pagination: {
            page,
            limit,
            total,
            totalPages: Math.max(1, Math.ceil(total / limit)),
         },
      };
   }

   async getResponsiById(id: string) {
      const row = await repo.findResponsiById(id);
      if (!row) {
         throw new AppError('Responsi not found', 404);
      }
      return this.formatResponsi(row);
   }

   async createResponsi(data: CreateResponsi, actor: SummaryActor) {
      this.requireSummaryPermission(actor, summaryPermissions.create);
      const status = data.status ?? 'DRAFT';
      if (status !== 'DRAFT' && status !== 'UNDER_REVIEW') {
         throw new AppError(
            'New summaries must start as draft or in review',
            400,
         );
      }
      const courseId = await this.resolveCourseId(data.course, actor);

      const created = await repo.createResponsi({
         title: data.title,
         summaryType: data.summaryType,
         courseId,
         academicPeriod: data.academicPeriod,
         examType: data.examType,
         pic: data.pic,
         content: data.content ?? '',
         status,
         ...(actor.permissions.has(summaryPermissions.edit) && {
            editorId: actor.id,
         }),
      });

      return this.formatResponsi(created);
   }

   async updateResponsi(
      id: string,
      data: UpdateResponsi,
      actor: SummaryActor,
      restore = false,
   ) {
      const existing = await repo.findResponsiById(id);
      if (!existing) {
         throw new AppError('Responsi not found', 404);
      }

      if (data.status === 'PUBLISHED' && existing.status !== 'PUBLISHED') {
         this.requireSummaryPermission(actor, summaryPermissions.publish);
      }
      if (data.status === 'ARCHIVED' && existing.status !== 'ARCHIVED') {
         this.requireSummaryPermission(actor, summaryPermissions.archive);
      }
      const courseChanged =
         data.course !== undefined &&
         data.course !== existing.courseId &&
         data.course !== existing.course.name;
      if (courseChanged) this.requireAssignedEditor(actor, existing.editors);
      const isPublishing =
         data.status === 'PUBLISHED' && existing.status !== 'PUBLISHED';
      if (isPublishing && existing.status !== 'UNDER_REVIEW') {
         throw new AppError('Summary must be in review before publishing', 409);
      }

      if (isPublishing && !existing.approvedById) {
         throw new AppError(
            'A reviewer must approve the summary before publishing',
            409,
         );
      }

      const courseId =
         courseChanged && data.course
            ? await this.resolveCourseId(data.course, actor)
            : existing.courseId;
      const changed =
         courseId !== existing.courseId ||
         (data.title !== undefined && data.title !== existing.title) ||
         (data.summaryType !== undefined &&
            data.summaryType !== existing.summaryType) ||
         (data.academicPeriod !== undefined &&
            data.academicPeriod !== existing.academicPeriod) ||
         (data.examType !== undefined && data.examType !== existing.examType) ||
         (data.pic !== undefined && data.pic !== existing.pic) ||
         (data.content !== undefined && data.content !== existing.content);

      if (
         restore ||
         changed ||
         (data.status !== undefined &&
            data.status !== existing.status &&
            data.status !== 'PUBLISHED' &&
            data.status !== 'ARCHIVED')
      ) {
         this.requireAssignedEditor(actor, existing.editors);
      }
      if (isPublishing && changed) {
         throw new AppError('Save changes before publishing the summary', 409);
      }

      if (
         isPublishing ||
         (data.status === 'ARCHIVED' && existing.status !== 'ARCHIVED')
      ) {
         this.requireStoredCollaboration(existing);
      }
      if (isPublishing) assertPublicDocument(existing.content);

      const nextStatus =
         existing.status === 'PUBLISHED' &&
         changed &&
         data.status !== 'ARCHIVED'
            ? 'UNDER_REVIEW'
            : (data.status ?? existing.status);

      const updated = await repo.updateResponsi(
         { id, status: existing.status, updatedAt: existing.updatedAt },
         {
            ...(data.summaryType !== undefined && {
               summaryType: data.summaryType,
            }),
            title: data.title,
            academicPeriod: data.academicPeriod,
            examType: data.examType,
            pic: data.pic,
            content: data.content,
            courseId,
            status: nextStatus,
            ...(restore ||
            (data.content !== undefined && data.content !== existing.content) ||
            (nextStatus !== existing.status &&
               (nextStatus === 'ARCHIVED' || nextStatus === 'PUBLISHED'))
               ? {
                    collaborationState: null,
                    collaborationRevision: { increment: 1 },
                 }
               : {}),
            ...(restore ||
            changed ||
            (nextStatus !== existing.status && nextStatus !== 'PUBLISHED')
               ? { approvedById: null }
               : {}),
         },
         isPublishing ? actor.id : undefined,
      );

      return this.formatResponsi(updated);
   }

   async approveResponsi(id: string, actor: SummaryActor) {
      this.requireSummaryPermission(actor, summaryPermissions.review);
      const existing = await repo.findResponsiById(id);
      if (!existing) throw new AppError('Responsi not found', 404);
      if (existing.status !== 'UNDER_REVIEW') {
         throw new AppError('Only summaries in review can be approved', 409);
      }
      this.requireStoredCollaboration(existing);
      const updated = await repo.updateResponsi(
         { id, status: existing.status, updatedAt: existing.updatedAt },
         { approvedById: actor.id },
      );
      return this.formatResponsi(updated);
   }

   findEditorCandidates(search: string, actor: SummaryActor) {
      this.requireSummaryPermission(actor, summaryPermissions.legacy);
      return repo.findEditorCandidates(search);
   }

   async assignResponsiEditors(
      id: string,
      editorIds: string[],
      actor: SummaryActor,
   ) {
      this.requireSummaryPermission(actor, summaryPermissions.legacy);
      const existing = await repo.findResponsiById(id);
      if (!existing) throw new AppError('Responsi not found', 404);
      const updated = await repo.updateResponsi(
         { id, status: existing.status, updatedAt: existing.updatedAt },
         { approvedById: null, updatedAt: new Date() },
         undefined,
         editorIds,
      );
      return this.formatResponsi(updated);
   }

   async deleteResponsi(id: string, actor: SummaryActor) {
      this.requireSummaryPermission(actor, summaryPermissions.legacy);
      await this.getResponsiById(id);
      await repo.deleteResponsi(id);
      return { message: 'Responsi deleted successfully' };
   }

   async restoreResponsiVersion(
      id: string,
      versionId: string,
      actor: SummaryActor,
   ) {
      const version = await repo.findResponsiVersion(id, versionId);
      if (!version) {
         throw new AppError('Published summary version not found', 404);
      }
      return this.updateResponsi(
         id,
         { content: version.content, status: 'UNDER_REVIEW' },
         actor,
         true,
      );
   }

   async listResponsiVersions(responsiId: string) {
      await this.getResponsiById(responsiId);
      const rows = await repo.listResponsiVersions(responsiId);
      const ids = [
         ...new Set(
            rows.flatMap((row) =>
               [row.createdBy, row.reviewerId, ...row.editorIds].filter(
                  (id) => id !== null,
               ),
            ),
         ),
      ];
      const names = new Map(
         (ids.length ? await repo.findCreditNames(ids) : []).map(
            ({ id, name }) => [id, name],
         ),
      );
      return rows.map((row) => ({
         id: row.id,
         responsiId: row.responsiId,
         version: row.version,
         content: row.content,
         status: row.status,
         createdBy: row.createdBy,
         reviewerId: row.reviewerId,
         author:
            row.createdBy === null
               ? null
               : (names.get(row.createdBy) ?? row.createdBy),
         reviewerName:
            row.reviewerId === null
               ? null
               : (names.get(row.reviewerId) ?? null),
         editorNames: row.editorIds.map((id) => names.get(id) ?? id),
         editorIds: row.editorIds,
         createdAt: row.createdAt.toISOString(),
      }));
   }
}

export const educationService = new EducationService();
