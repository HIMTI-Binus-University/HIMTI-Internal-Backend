import { Prisma } from '@prisma/client';
import { AppError } from '@/utils/appError.js';
import { eventCommitteeService } from '@/features/event-committee/eventCommitteeService.js';
import { eventPackageRepository } from './eventPackageRepository.js';
import type {
   CreateEventPackageRequest,
   SessionUser,
   UpdateEventPackageRequest,
} from './eventPackageTypes.js';

type PackageRow = NonNullable<
   Awaited<ReturnType<typeof eventPackageRepository.find>>
>;

const mapPackage = (row: PackageRow) => ({
   ...row,
   priceMinor: row.priceMinor.toString(),
   salesStartAt: row.salesStartAt?.toISOString() ?? null,
   salesEndAt: row.salesEndAt?.toISOString() ?? null,
   createdAt: row.createdAt.toISOString(),
   updatedAt: row.updatedAt?.toISOString() ?? null,
   dependentOrderCount: row._count.orders,
   editable: row._count.orders === 0,
   _count: undefined,
});

const translateUniqueConflict = (error: unknown): never => {
   if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
   )
      throw new AppError(
         'Package code already exists',
         409,
         'PACKAGE_CODE_EXISTS',
      );
   throw error;
};

class EventPackageService {
   private async authorizeSubEvent(subEventId: string, user: SessionUser) {
      const subEvent = await eventPackageRepository.findSubEvent(subEventId);
      if (!subEvent)
         throw new AppError('Sub-event not found', 404, 'SUB_EVENT_NOT_FOUND');
      await eventCommitteeService.assertEventCommitteeMemberOrAdmin(
         subEvent.eventId,
         user,
      );
      return subEvent;
   }

   async list(subEventId: string, user: SessionUser) {
      await this.authorizeSubEvent(subEventId, user);
      return (await eventPackageRepository.list(subEventId)).map(mapPackage);
   }

   async create(
      subEventId: string,
      user: SessionUser,
      payload: CreateEventPackageRequest,
   ) {
      const subEvent = await this.authorizeSubEvent(subEventId, user);
      const result = await eventPackageRepository
         .create({
            eventId: subEvent.eventId,
            subEventId,
            ...payload,
            priceMinor: BigInt(payload.priceMinor),
            salesStartAt: payload.salesStartAt
               ? new Date(payload.salesStartAt)
               : null,
            salesEndAt: payload.salesEndAt
               ? new Date(payload.salesEndAt)
               : null,
         })
         .catch(translateUniqueConflict);
      return mapPackage(result);
   }

   async update(
      packageId: string,
      user: SessionUser,
      payload: UpdateEventPackageRequest,
   ) {
      const existing = await eventPackageRepository.find(packageId);
      if (!existing)
         throw new AppError('Package not found', 404, 'PACKAGE_NOT_FOUND');
      await this.authorizeSubEvent(existing.subEventId, user);
      const commercialChange = [
         payload.code,
         payload.name,
         payload.description,
         payload.seatCount,
         payload.currency,
         payload.priceMinor,
         payload.salesStartAt,
         payload.salesEndAt,
      ].some((value) => value !== undefined);
      if (existing._count.orders > 0 && commercialChange)
         throw new AppError(
            'Referenced package commercial fields are immutable',
            409,
            'PACKAGE_IMMUTABLE',
         );
      const { revision, priceMinor, salesStartAt, salesEndAt, ...rest } =
         payload;
      const result = await eventPackageRepository
         .updateCas(packageId, revision, {
            ...rest,
            ...(priceMinor !== undefined && { priceMinor: BigInt(priceMinor) }),
            ...(salesStartAt !== undefined && {
               salesStartAt: salesStartAt ? new Date(salesStartAt) : null,
            }),
            ...(salesEndAt !== undefined && {
               salesEndAt: salesEndAt ? new Date(salesEndAt) : null,
            }),
         })
         .catch(translateUniqueConflict);
      if (!result)
         throw new AppError(
            'Package revision changed',
            409,
            'PACKAGE_REVISION_CONFLICT',
         );
      return mapPackage(result);
   }
}

export const eventPackageService = new EventPackageService();
