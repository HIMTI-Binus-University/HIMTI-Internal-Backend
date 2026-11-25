import type { Prisma, ResponsiStatus } from '@prisma/client';
import { AppError } from '@/utils/appError.js';
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

class EducationService {
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
   private async resolveCourseId(courseIdentifier: string) {
      let course = await repo.findCourseGroupById(courseIdentifier);
      if (!course) {
         course = await repo.findCourseGroupByName(courseIdentifier);
      }
      if (!course) {
         // Auto-create course group if name given is not in DB yet
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
      editors?: { userId: string }[];
      approvedById?: string | null;
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
         approvedById: row.approvedById,
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
      const courseId = await this.resolveCourseId(data.course);

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

   async updateResponsi(id: string, data: UpdateResponsi, actor: SummaryActor) {
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
            ? await this.resolveCourseId(data.course)
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
            ...(changed ||
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
      const updated = await repo.updateResponsi(
         { id, status: existing.status, updatedAt: existing.updatedAt },
         { approvedById: actor.id },
      );
      return this.formatResponsi(updated);
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
      );
   }

   async listResponsiVersions(responsiId: string) {
      await this.getResponsiById(responsiId);
      const rows = await repo.listResponsiVersions(responsiId);
      return rows.map((row) => ({
         id: row.id,
         responsiId: row.responsiId,
         version: row.version,
         content: row.content,
         status: row.status,
         createdBy: row.createdBy,
         reviewerId: row.reviewerId,
         editorIds: row.editorIds,
         createdAt: row.createdAt.toISOString(),
      }));
   }
}

export const educationService = new EducationService();
