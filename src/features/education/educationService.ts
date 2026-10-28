import { AppError } from '@/utils/appError.js';
import { educationRepository as repo } from './educationRepository.js';
import type {
   CourseGroupList,
   CreateCourseGroup,
   UpdateCourseGroup,
} from './educationTypes.js';

class EducationService {
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
}

export const educationService = new EducationService();
