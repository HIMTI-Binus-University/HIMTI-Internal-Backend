import type { StudyClubSession } from '@prisma/client';
import { educationRepository } from '@/features/education/educationRepository.js';
import { AppError } from '@/utils/appError.js';
import { studyClubRepository as repo } from './studyClubRepository.js';
import { CreateStudyClubSchema } from './studyClubSchema.js';
import type {
   CreateStudyClub,
   StudyClubListQuery,
   UpdateStudyClub,
} from './studyClubTypes.js';

class StudyClubService {
   private format(row: StudyClubSession & { course: { name: string } }) {
      return {
         id: row.id,
         title: row.title,
         type: row.type as CreateStudyClub['type'],
         courseId: row.courseId,
         course: row.course.name,
         description: row.description,
         startsAt: row.startsAt.toISOString(),
         endsAt: row.endsAt.toISOString(),
         location: row.location,
         meetingUrl: row.meetingUrl,
         registrationUrl: row.registrationUrl,
         capacity: row.capacity,
         isDemo: row.isDemo,
         createdAt: row.createdAt.toISOString(),
         updatedAt: row.updatedAt.toISOString(),
      };
   }

   private async assertActiveCourse(id: string) {
      const course = await educationRepository.findCourseGroupById(id);
      if (!course) throw new AppError('Course group not found', 404);
      if (course.status !== 'ACTIVE')
         throw new AppError('Select an active course group', 400);
   }

   async list(query: StudyClubListQuery) {
      const [rows, total] = await repo.list(query, new Date());
      return {
         data: rows.map((row) => this.format(row)),
         pagination: {
            page: query.page,
            limit: query.limit,
            total,
            totalPages: Math.max(1, Math.ceil(total / query.limit)),
         },
      };
   }

   async get(id: string) {
      const session = await repo.findById(id);
      if (!session) throw new AppError('Study Club session not found', 404);
      return this.format(session);
   }

   async create(payload: CreateStudyClub, actorId: string) {
      await this.assertActiveCourse(payload.courseId);
      return this.format(await repo.create(payload, actorId));
   }

   async update(id: string, payload: UpdateStudyClub, actorId: string) {
      const current = await this.get(id);
      const data = CreateStudyClubSchema.parse({
         title: current.title,
         type: current.type,
         courseId: current.courseId,
         description: current.description,
         startsAt: current.startsAt,
         endsAt: current.endsAt,
         location: current.location,
         meetingUrl: current.meetingUrl,
         registrationUrl: current.registrationUrl,
         capacity: current.capacity,
         ...payload,
      });
      if (data.courseId !== current.courseId)
         await this.assertActiveCourse(data.courseId);
      return this.format(await repo.update(id, data, actorId));
   }
}

export const studyClubService = new StudyClubService();
