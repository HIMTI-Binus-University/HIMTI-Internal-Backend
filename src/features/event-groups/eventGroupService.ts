import { Prisma } from '@prisma/client';
import { AppError } from '@/utils/appError.js';
import { isAdminUser } from '@/utils/statusAccess.js';
import { eventGroupRepository as repo } from './eventGroupRepository.js';
import type {
   EventGroupBody,
   EventGroupList,
   EventGroupUpdate,
} from './eventGroupTypes.js';
type User = { id: string; roles?: unknown };
class EventGroupService {
   listPublic(q: EventGroupList) {
      return repo.listPublic(q);
   }
   async getPublic(id: string) {
      const value = await repo.getPublic(id);
      if (!value) throw new AppError('Event group not found', 404);
      return value;
   }
   listInternal(q: EventGroupList, user: User) {
      return repo.listInternal(q, user.id, isAdminUser(user));
   }
   async scope(id: string, user: User) {
      const value = await repo.find(id);
      if (!value) throw new AppError('Event group not found', 404);
      if (!isAdminUser(user) && !(await repo.hasScope(id, user.id)))
         throw new AppError('Event group scope required', 403);
      return value;
   }
   async managerScope(id: string, user: User) {
      const value = await repo.find(id);
      if (!value) throw new AppError('Event group not found', 404);
      if (!isAdminUser(user) && !(await repo.hasManagerScope(id, user.id)))
         throw new AppError('Event group manager scope required', 403);
      return value;
   }
   create(body: EventGroupBody, user: User) {
      return repo.create({
         ...body,
         creator: { connect: { id: user.id } },
         organizers: {
            create: { userId: user.id, role: 'MANAGER', assignedBy: user.id },
         },
      } as Prisma.EventGroupCreateInput);
   }
   async update(id: string, body: EventGroupUpdate, user: User) {
      await this.managerScope(id, user);
      return repo.update(id, {
         ...body,
         updater: { connect: { id: user.id } },
      });
   }
   async transition(id: string, status: 'PUBLISHED' | 'ARCHIVED', user: User) {
      await this.managerScope(id, user);
      return repo.update(id, { status, updater: { connect: { id: user.id } } });
   }
   async organizers(id: string, user: User) {
      await this.scope(id, user);
      return repo.organizers(id);
   }
   async addOrganizer(
      id: string,
      target: string,
      role: 'MANAGER' | 'ORGANIZER',
      user: User,
   ) {
      await this.managerScope(id, user);
      return repo.addOrganizer(id, target, role, user.id);
   }
   async updateOrganizer(
      id: string,
      target: string,
      role: 'MANAGER' | 'ORGANIZER',
      user: User,
   ) {
      await this.managerScope(id, user);
      const result = await repo.changeOrganizer(id, target, role);
      if (result.result === 'NOT_FOUND')
         throw new AppError('Event group organizer not found', 404);
      if (result.result === 'LAST_MANAGER')
         throw new AppError(
            'The last Event group manager cannot be demoted',
            409,
         );
      return result.data;
   }
   async removeOrganizer(id: string, target: string, user: User) {
      await this.managerScope(id, user);
      const result = await repo.changeOrganizer(id, target, null);
      if (result.result === 'NOT_FOUND')
         throw new AppError('Event group organizer not found', 404);
      if (result.result === 'LAST_MANAGER')
         throw new AppError(
            'The last Event group manager cannot be removed',
            409,
         );
      return result.data;
   }
}
export const eventGroupService = new EventGroupService();
