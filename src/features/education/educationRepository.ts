import type { Prisma, ResponsiStatus } from '@prisma/client';
import { AppError } from '@/utils/appError.js';
import { prisma } from '@/config/prisma.js';
import type {
   CourseGroupList,
   CreateCourseGroup,
   UpdateCourseGroup,
} from './educationTypes.js';

const eligibleEditor = {
   status: 'ACTIVE',
   userHasRoles: {
      some: {
         role: {
            status: 'ACTIVE',
            roleHasPermissions: {
               some: {
                  permission: {
                     name: {
                        in: ['edit_education_summary', 'manage_education'],
                     },
                     status: 'ACTIVE',
                  },
               },
            },
         },
      },
   },
} satisfies Prisma.UserWhereInput;

class EducationRepository {
   // Course Groups
   async listCourseGroups(query: CourseGroupList) {
      const where: Prisma.CourseWhereInput = {
         status: 'ACTIVE',
         ...(query.search && {
            OR: [
               { name: { contains: query.search, mode: 'insensitive' } },
               { code: { contains: query.search, mode: 'insensitive' } },
            ],
         }),
      };

      const courses = await prisma.course.findMany({
         where,
         orderBy: { name: 'asc' },
         select: {
            id: true,
            name: true,
            code: true,
            description: true,
            semester: true,
            status: true,
            _count: { select: { responsies: true, studyClubSessions: true } },
            studyClubSessions: {
               select: { _count: { select: { videos: true } } },
            },
         },
      });
      return courses.map(({ _count, studyClubSessions, ...course }) => ({
         ...course,
         counts: {
            summaries: _count.responsies,
            schedules: _count.studyClubSessions,
            videos: studyClubSessions.reduce(
               (total, session) => total + session._count.videos,
               0,
            ),
         },
      }));
   }

   async findCourseGroupById(id: string) {
      return await prisma.course.findUnique({
         where: { id },
         select: {
            id: true,
            name: true,
            code: true,
            description: true,
            semester: true,
            status: true,
         },
      });
   }

   async findCourseGroupByName(name: string) {
      return await prisma.course.findUnique({
         where: { name },
         select: {
            id: true,
            name: true,
            code: true,
            semester: true,
            description: true,
            status: true,
         },
      });
   }

   async createCourseGroup(data: CreateCourseGroup) {
      return await prisma.course.create({
         data: {
            name: data.name,
            code: data.code ? data.code : null,
            description: data.description ? data.description : null,
            semester: data.semester,
         },
         select: {
            id: true,
            name: true,
            code: true,
            description: true,
            semester: true,
            status: true,
         },
      });
   }

   async updateCourseGroup(id: string, data: UpdateCourseGroup) {
      return await prisma.course.update({
         where: { id },
         data: {
            ...(data.name !== undefined && { name: data.name }),
            ...(data.code !== undefined && {
               code: data.code ? data.code : null,
            }),
            ...(data.description !== undefined && {
               description: data.description ? data.description : null,
            }),
            ...(data.status !== undefined && { status: data.status }),
            semester: data.semester,
         },
         select: {
            id: true,
            name: true,
            code: true,
            description: true,
            semester: true,
            status: true,
         },
      });
   }

   // Responsi
   async listResponsies(where: Prisma.ResponsiWhereInput, skip = 0, take = 50) {
      return await prisma.responsi.findMany({
         where,
         skip,
         take,
         orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
         include: {
            course: {
               select: {
                  id: true,
                  name: true,
                  code: true,
               },
            },
         },
      });
   }

   async countResponsies(where: Prisma.ResponsiWhereInput) {
      return await prisma.responsi.count({ where });
   }

   findEditorCandidates(search: string) {
      return prisma.user.findMany({
         where: {
            name: { contains: search, mode: 'insensitive' },
            ...eligibleEditor,
         },
         orderBy: [{ name: 'asc' }, { id: 'asc' }],
         take: 20,
         select: { id: true, name: true },
      });
   }

   findCollaborationDocument(id: string) {
      return prisma.responsi.findUnique({
         where: { id },
         select: {
            status: true,
            content: true,
            collaborationState: true,
            collaborationRevision: true,
            editors: { select: { userId: true } },
         },
      });
   }

   async storeCollaborationDocument(
      id: string,
      collaborationRevision: number,
      collaborationState: Uint8Array<ArrayBuffer>,
      content: string,
   ) {
      await prisma.$transaction(async (tx) => {
         const where = {
            id,
            collaborationRevision,
            status: { in: ['DRAFT', 'UNDER_REVIEW'] as ResponsiStatus[] },
         };
         const { count } = await tx.responsi.updateMany({
            where: { ...where, content: { not: content } },
            data: { content, approvedById: null, collaborationState },
         });
         if (!count) {
            await tx.responsi.updateMany({
               where: { ...where, content },
               data: { collaborationState },
            });
         }
      });
   }

   async getSummaryPermissions(userId: string) {
      const roles = await prisma.userHasRole.findMany({
         where: {
            userId,
            user: { status: 'ACTIVE' },
            role: { status: 'ACTIVE' },
         },
         select: {
            role: {
               select: {
                  roleHasPermissions: {
                     where: { permission: { status: 'ACTIVE' } },
                     select: { permission: { select: { name: true } } },
                  },
               },
            },
         },
      });
      return new Set(
         roles.flatMap(({ role }) =>
            role.roleHasPermissions.map(({ permission }) => permission.name),
         ),
      );
   }

   async findResponsiById(id: string) {
      return await prisma.responsi.findUnique({
         where: { id },
         include: {
            editors: {
               select: { userId: true, user: { select: { name: true } } },
            },
            course: {
               select: {
                  id: true,
                  name: true,
                  code: true,
               },
            },
         },
      });
   }

   async createResponsi(data: {
      title: string;
      summaryType: string;
      courseId: string;
      academicPeriod: string;
      examType: string;
      pic: string;
      content: string;
      status: ResponsiStatus;
      editorId?: string;
   }) {
      const { editorId, ...fields } = data;
      return await prisma.responsi.create({
         data: {
            ...fields,
            ...(editorId && { editors: { create: { userId: editorId } } }),
         },
         include: {
            course: {
               select: {
                  id: true,
                  name: true,
                  code: true,
               },
            },
         },
      });
   }

   async updateResponsi(
      where: Prisma.ResponsiWhereInput & { id: string },
      data: Prisma.ResponsiUncheckedUpdateInput,
      publisherId?: string,
      editorIds?: string[],
   ) {
      return prisma.$transaction(async (tx) => {
         const { count } = await tx.responsi.updateMany({ where, data });
         if (count !== 1) {
            throw new AppError(
               'Summary changed. Reload it and try again.',
               409,
            );
         }
         if (editorIds) {
            const activeEditors = await tx.user.count({
               where: { id: { in: editorIds }, ...eligibleEditor },
            });
            if (activeEditors !== editorIds.length) {
               throw new AppError(
                  'Every assigned editor must be active and have edit permission',
                  400,
               );
            }
            await tx.responsiEditor.deleteMany({
               where: { responsiId: where.id },
            });
            await tx.responsiEditor.createMany({
               data: editorIds.map((userId) => ({
                  responsiId: where.id,
                  userId,
               })),
            });
         }

         const updated = await tx.responsi.findUniqueOrThrow({
            where: { id: where.id },
            include: {
               editors: {
                  select: { userId: true, user: { select: { name: true } } },
               },
               course: { select: { id: true, name: true, code: true } },
            },
         });

         if (data.status === 'ARCHIVED') {
            await tx.responsiPublication.deleteMany({
               where: { id: updated.id },
            });
         }
         if (publisherId) {
            const publication = {
               courseId: updated.courseId,
               title: updated.title,
               academicPeriod: updated.academicPeriod,
               examType: updated.examType,
               content: updated.content,
            };
            await tx.responsiPublication.upsert({
               where: { id: updated.id },
               create: { id: updated.id, ...publication },
               update: publication,
            });
            const versions = await tx.responsiVersion.count({
               where: { responsiId: updated.id },
            });
            await tx.responsiVersion.create({
               data: {
                  responsiId: updated.id,
                  version: `v${versions + 1}`,
                  content: updated.content,
                  status: 'PUBLISHED',
                  createdBy: publisherId,
                  reviewerId: updated.approvedById,
                  editorIds: updated.editors.map(({ userId }) => userId),
               },
            });
         }

         return updated;
      });
   }

   async deleteResponsi(id: string) {
      return prisma.responsi.delete({ where: { id } });
   }

   findResponsiVersion(responsiId: string, versionId: string) {
      return prisma.responsiVersion.findFirst({
         where: { id: versionId, responsiId, status: 'PUBLISHED' },
      });
   }

   findCreditNames(ids: string[]) {
      return prisma.user.findMany({
         where: { id: { in: ids } },
         select: { id: true, name: true },
      });
   }

   async listResponsiVersions(responsiId: string) {
      return await prisma.responsiVersion.findMany({
         where: { responsiId },
         orderBy: { createdAt: 'desc' },
      });
   }
}

export const educationRepository = new EducationRepository();
