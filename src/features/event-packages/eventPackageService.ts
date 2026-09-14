import { AppError } from '@/utils/appError.js';
import { eventService } from '@/features/events/eventService.js';
import { eventPackageRepository as repo } from './eventPackageRepository.js';
import type {
   CreateEventPackageRequest,
   UpdateEventPackageRequest,
} from './eventPackageTypes.js';

type User = { id: string; roles?: unknown };
const serialize = <T extends { priceMinor: bigint }>(value: T) => ({
   ...value,
   priceMinor: value.priceMinor.toString(),
});
const codeBase = (name: string) =>
   name
      .normalize('NFKD')
      .replace(/[^a-zA-Z0-9]+/g, '_')
      .replace(/^_|_$/g, '')
      .toUpperCase()
      .slice(0, 80) || 'PACKAGE';

class EventPackageService {
   async list(eventId: string, user: User) {
      await eventService.assertScope(eventId, user);
      return (await repo.list(eventId)).map(serialize);
   }
   async get(eventId: string, id: string, user: User) {
      await eventService.assertScope(eventId, user);
      const value = await repo.find(eventId, id);
      if (!value) throw new AppError('Event package not found', 404);
      return serialize(value);
   }
   async create(eventId: string, body: CreateEventPackageRequest, user: User) {
      await eventService.assertScope(eventId, user);
      const base = codeBase(body.name);
      const used = new Set(
         (await repo.codes(eventId, base)).map(({ code }) => code),
      );
      let code = base;
      for (let suffix = 2; used.has(code); suffix++) code = `${base}_${suffix}`;
      return serialize(
         await repo.create({ eventId, code, status: 'DRAFT', ...body }),
      );
   }
   async update(
      eventId: string,
      id: string,
      body: UpdateEventPackageRequest,
      user: User,
   ) {
      const current = await this.require(eventId, id, user);
      if (
         (await repo.orderCount(id)) > 0 &&
         (body.seatCount !== undefined ||
            body.currency !== undefined ||
            body.priceMinor !== undefined)
      )
         throw new AppError(
            'Commercial package terms are immutable after an order exists',
            409,
         );
      const start = body.salesStartAt ?? current.salesStartAt;
      const end = body.salesEndAt ?? current.salesEndAt;
      if (start && end && end <= start)
         throw new AppError('salesEndAt must be after salesStartAt', 400);
      return serialize(await repo.update(id, body));
   }
   async status(eventId: string, id: string, active: boolean, user: User) {
      await this.require(eventId, id, user);
      return serialize(
         await repo.update(id, { status: active ? 'ACTIVE' : 'INACTIVE' }),
      );
   }
   private async require(eventId: string, id: string, user: User) {
      await eventService.assertScope(eventId, user);
      const value = await repo.find(eventId, id);
      if (!value) throw new AppError('Event package not found', 404);
      return value;
   }
}
export const eventPackageService = new EventPackageService();
