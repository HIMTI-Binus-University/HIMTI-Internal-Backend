import { educationRepository as repo } from './educationRepository.js';
import type { CourseGroupList } from './educationTypes.js';

class EducationService {
   listCourseGroups(query: CourseGroupList) {
      return repo.listCourseGroups(query);
   }
}

export const educationService = new EducationService();
