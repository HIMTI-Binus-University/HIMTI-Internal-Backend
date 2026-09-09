import {
   createCipheriv,
   createDecipheriv,
   createHash,
   createHmac,
   randomBytes,
   timingSafeEqual,
} from 'node:crypto';
import { Prisma } from '@prisma/client';
import { AppError } from '@/utils/appError.js';
import { eventService } from '@/features/events/eventService.js';
import { eventRegistrationRepository as repo } from './eventRegistrationRepository.js';
import type {
   CancelEventRegistrationRequest,
   BundleRevisionRequest,
   CreateEventBundleRequest,
   CreateEventRegistrationRequest,
   EventRegistrationListQuery,
   InternalEventRegistrationListQuery,
   JoinEventBundleRequest,
   RemoveBundleMemberRequest,
   RegistrationQuestion,
   ReplaceRegistrationAnswersRequest,
} from './eventRegistrationTypes.js';
import {
   resolveRegistrationProfile,
   validateRegistrationAnswers,
} from './eventRegistrationTypes.js';

const questionsOf = (form: {
   sections: {
      questions: {
         id: string;
         fieldKey: string;
         type: RegistrationQuestion['type'];
         isRequired: boolean;
         validation: unknown;
         options: { id: string; value: string }[];
      }[];
   }[];
}) => form.sections.flatMap(({ questions }) => questions);

const serialize = (value: unknown): unknown => {
   if (typeof value === 'bigint') return value.toString();
   if (value instanceof Prisma.Decimal) return value.toString();
   if (value instanceof Date) return value.toISOString();
   if (Array.isArray(value)) return value.map(serialize);
   if (value && typeof value === 'object')
      return Object.fromEntries(
         Object.entries(value).map(([key, child]) => [key, serialize(child)]),
      );
   return value;
};

const validationError = (error: unknown) =>
   new AppError(
      error instanceof Error ? error.message : 'Invalid registration answers',
      400,
      'INVALID_REGISTRATION_ANSWERS',
   );

export const normalizeBundleCode = (value: string) =>
   value.replace(/[^A-Z0-9]/gi, '').toUpperCase();

const bundleSecret = () => {
   const secret = process.env.BUNDLE_CODE_HMAC_SECRET;
   if (!secret || Buffer.byteLength(secret) < 32)
      throw new AppError(
         'Bundle registration is not configured',
         503,
         'BUNDLE_CODE_UNAVAILABLE',
      );
   return secret;
};

export const hashBundleCode = (value: string, secret = bundleSecret()) =>
   createHmac('sha256', secret)
      .update(normalizeBundleCode(value))
      .digest('hex');

const bundleEncryptionKey = (secret: string) =>
   createHash('sha256')
      .update('himti-registration-bundle-code\0')
      .update(secret)
      .digest();

export const encryptBundleCode = (value: string, secret = bundleSecret()) => {
   const iv = randomBytes(12);
   const cipher = createCipheriv(
      'aes-256-gcm',
      bundleEncryptionKey(secret),
      iv,
   );
   const ciphertext = Buffer.concat([
      cipher.update(value, 'utf8'),
      cipher.final(),
   ]);
   return ['v1', iv, cipher.getAuthTag(), ciphertext]
      .map((part) =>
         typeof part === 'string' ? part : part.toString('base64url'),
      )
      .join('.');
};

export const decryptBundleCode = (value: string, secret = bundleSecret()) => {
   try {
      const [version, encodedIv, encodedTag, encodedCiphertext, extra] =
         value.split('.');
      if (
         version !== 'v1' ||
         !encodedIv ||
         !encodedTag ||
         !encodedCiphertext ||
         extra
      )
         throw new Error('Invalid encrypted Bundle Code');
      const iv = Buffer.from(encodedIv, 'base64url');
      const tag = Buffer.from(encodedTag, 'base64url');
      if (iv.length !== 12 || tag.length !== 16)
         throw new Error('Invalid encrypted Bundle Code');
      const decipher = createDecipheriv(
         'aes-256-gcm',
         bundleEncryptionKey(secret),
         iv,
      );
      decipher.setAuthTag(tag);
      return Buffer.concat([
         decipher.update(Buffer.from(encodedCiphertext, 'base64url')),
         decipher.final(),
      ]).toString('utf8');
   } catch {
      throw new AppError(
         'Bundle Code is unavailable',
         503,
         'BUNDLE_CODE_UNAVAILABLE',
      );
   }
};

export const equalBundleCodeHashes = (left: string, right: string) => {
   const leftBuffer = Buffer.from(left, 'hex');
   const rightBuffer = Buffer.from(right, 'hex');
   return (
      leftBuffer.length === rightBuffer.length &&
      timingSafeEqual(leftBuffer, rightBuffer)
   );
};

const bundleCodeAlphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

export const generateBundleCode = (seed?: string) => {
   const bytes = seed
      ? createHmac('sha256', bundleSecret())
           .update(seed)
           .digest()
           .subarray(0, 8)
      : randomBytes(8);
   const value = bytes.readBigUInt64BE() >> 4n;
   const code = Array.from({ length: 12 }, (_, index) =>
      bundleCodeAlphabet.charAt(
         Number((value >> BigInt((11 - index) * 5)) & 31n),
      ),
   ).join('');
   return code.match(/.{4}/g)!.join('-');
};

const retrySerializable = async <T>(
   operation: () => Promise<T>,
): Promise<T> => {
   for (let attempt = 0; ; attempt++) {
      try {
         return await operation();
      } catch (error) {
         if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === 'P2034' &&
            attempt < 2
         )
            continue;
         throw error;
      }
   }
};

class EventRegistrationService {
   async supplementalTracking(
      eventId: string,
      query: EventRegistrationListQuery,
      user: { id: string; roles?: unknown },
   ) {
      await eventService.assertScope(eventId, user);
      return repo.supplementalTracking(eventId, query);
   }

   async saveSupplemental(
      id: string,
      body: ReplaceRegistrationAnswersRequest,
      userId: string,
   ) {
      await repo.saveSupplemental(id, userId, body);
      return this.get(id, userId);
   }
   async context(eventId: string) {
      const event = await repo.context(eventId);
      if (!event) throw new AppError('Event not found', 404, 'EVENT_NOT_FOUND');
      const now = new Date();
      return serialize({
         event: {
            id: event.id,
            name: event.name,
            capacity: event.capacity,
            currency: event.paymentCurrency,
            registrationOpen:
               event.isRegistrationOpen &&
               (!event.registrationOpensAt ||
                  event.registrationOpensAt <= now) &&
               (!event.registrationClosesAt ||
                  event.registrationClosesAt > now),
            registrationOpensAt: event.registrationOpensAt,
            registrationClosesAt: event.registrationClosesAt,
         },
         packages: event.ticketPackages,
         form: event.registrationForms[0] ?? null,
      });
   }

   async create(
      eventId: string,
      body: CreateEventRegistrationRequest,
      userId: string,
   ) {
      const [context, profileSource] = await Promise.all([
         repo.context(eventId),
         repo.profile(userId),
      ]);
      if (!context)
         throw new AppError('Event not found', 404, 'EVENT_NOT_FOUND');
      if (!profileSource)
         throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      const profile = resolveRegistrationProfile(profileSource);
      if (!profile.complete)
         throw new AppError(
            `Complete your profile before registering: ${profile.missingFields.join(', ')}`,
            409,
            'PROFILE_INCOMPLETE',
         );
      const form = context.registrationForms[0];
      if (!form)
         throw new AppError(
            'No published registration form is available',
            409,
            'PUBLISHED_FORM_REQUIRED',
         );
      let validated;
      try {
         validated = validateRegistrationAnswers(
            questionsOf(form),
            body.answers,
         );
      } catch (error) {
         throw validationError(error);
      }
      const result = await retrySerializable(() =>
         repo.create(
            eventId,
            body.ticketPackageId,
            form.id,
            userId,
            validated.answers,
         ),
      );
      if (result.result === 'EVENT_NOT_FOUND')
         throw new AppError('Event not found', 404, 'EVENT_NOT_FOUND');
      if (result.result === 'REGISTRATION_CLOSED')
         throw new AppError(
            'Event registration is closed',
            409,
            'REGISTRATION_CLOSED',
         );
      if (result.result === 'PACKAGE_NOT_FOUND')
         throw new AppError(
            'Active individual ticket package not found',
            404,
            'TICKET_PACKAGE_NOT_FOUND',
         );
      if (result.result === 'SOLD_OUT')
         throw new AppError('Event capacity is full', 409, 'EVENT_SOLD_OUT');
      if (result.result === 'PAYMENT_UNCONFIGURED')
         throw new AppError(
            'Event payment destination is not configured',
            409,
            'PAYMENT_NOT_CONFIGURED',
         );
      if (result.result === 'FORM_NOT_FOUND')
         throw new AppError(
            'No published registration form is available',
            409,
            'PUBLISHED_FORM_REQUIRED',
         );
      if (result.result === 'DUPLICATE')
         throw new AppError(
            'You already have an active registration for this event',
            409,
            'ACTIVE_REGISTRATION_EXISTS',
         );
      await this.finalizeIfReady(result.orderId, userId);
      return this.get(result.orderId, userId);
   }

   async createBundle(
      eventId: string,
      body: CreateEventBundleRequest,
      userId: string,
      idempotencyKey: string,
   ) {
      const [context, profileSource] = await Promise.all([
         repo.context(eventId),
         repo.profile(userId),
      ]);
      if (!context)
         throw new AppError('Event not found', 404, 'EVENT_NOT_FOUND');
      if (!profileSource)
         throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      const profile = resolveRegistrationProfile(profileSource);
      if (!profile.complete)
         throw new AppError(
            `Complete your profile before registering: ${profile.missingFields.join(', ')}`,
            409,
            'PROFILE_INCOMPLETE',
         );
      const form = context.registrationForms[0];
      if (!form)
         throw new AppError(
            'No published registration form is available',
            409,
            'PUBLISHED_FORM_REQUIRED',
         );
      let validated;
      try {
         validated = validateRegistrationAnswers(
            questionsOf(form),
            body.answers,
         );
      } catch (error) {
         throw validationError(error);
      }
      const bundleCode = generateBundleCode(
         JSON.stringify([userId, eventId, idempotencyKey, body]),
      );
      const bundleCodeEncrypted = encryptBundleCode(bundleCode);
      const result = await retrySerializable(() =>
         repo.createBundle(
            eventId,
            body.ticketPackageId,
            form.id,
            userId,
            hashBundleCode(bundleCode),
            bundleCodeEncrypted,
            validated.answers,
         ),
      );
      this.assertCreateResult(result.result, true);
      return {
         registration: await this.get(result.orderId!, userId),
         bundleCode,
      };
   }

   async joinBundle(
      eventId: string,
      body: JoinEventBundleRequest,
      userId: string,
   ) {
      const profileSource = await repo.profile(userId);
      if (!profileSource || !resolveRegistrationProfile(profileSource).complete)
         throw new AppError(
            'Complete your profile before joining a Bundle',
            409,
            'PROFILE_INCOMPLETE',
         );
      const result = await retrySerializable(() =>
         repo.joinBundle(
            eventId,
            body.ticketPackageId,
            hashBundleCode(body.bundleCode),
            userId,
         ),
      );
      if (result.result === 'DUPLICATE')
         throw new AppError(
            'Bundle Code is invalid or the Bundle is unavailable',
            404,
            'BUNDLE_UNAVAILABLE',
         );
      if (result.result === 'UNAVAILABLE')
         throw new AppError(
            'Bundle Code is invalid or the Bundle is unavailable',
            404,
            'BUNDLE_UNAVAILABLE',
         );
      await this.finalizeIfReady(result.orderId, userId);
      return this.get(result.orderId, userId);
   }

   async replaceBundleCode(
      id: string,
      body: BundleRevisionRequest,
      userId: string,
   ) {
      const bundleCode = generateBundleCode();
      const bundleCodeEncrypted = encryptBundleCode(bundleCode);
      const result = await retrySerializable(() =>
         repo.replaceBundleCode(
            id,
            userId,
            body.expectedRevision,
            hashBundleCode(bundleCode),
            bundleCodeEncrypted,
         ),
      );
      this.assertMembershipResult(result.result);
      return { registration: await this.get(id, userId), bundleCode };
   }

   async leave(id: string, body: BundleRevisionRequest, userId: string) {
      const result = await retrySerializable(() =>
         repo.changeBundleMember(
            id,
            userId,
            userId,
            body.expectedRevision,
            false,
         ),
      );
      this.assertMembershipResult(result.result);
      return { left: true };
   }

   async internalBundles(
      eventId: string,
      query: EventRegistrationListQuery,
      user: { id: string; roles?: unknown },
   ) {
      await eventService.assertScope(eventId, user);
      return serialize(await repo.internalList(eventId, query));
   }

   async internalRegistrations(
      eventId: string,
      query: InternalEventRegistrationListQuery,
      user: { id: string; roles?: unknown },
   ) {
      await eventService.assertScope(eventId, user);
      const { data, totalRecords } = await repo.internalRegistrations(
         eventId,
         query,
      );
      return serialize({
         data: data.map(({ _count, ...order }) => ({
            ...order,
            kind: order.seatCount === 1 ? 'INDIVIDUAL' : 'BUNDLE',
            memberCount: _count.members,
         })),
         meta: {
            page: query.page,
            limit: query.limit,
            totalRecords,
            totalPages: Math.ceil(totalRecords / query.limit),
         },
      });
   }

   async internalRegistration(
      eventId: string,
      id: string,
      user: { id: string; roles?: unknown },
   ) {
      await eventService.assertScope(eventId, user);
      const order = await repo.internalRegistration(eventId, id);
      if (!order)
         throw new AppError(
            'Registration not found',
            404,
            'REGISTRATION_NOT_FOUND',
         );
      return serialize({
         ...order,
         kind: order.seatCount === 1 ? 'INDIVIDUAL' : 'BUNDLE',
         members: order.members.map((member) => ({
            ...member,
            name: member.snapshotName ?? member.user.name,
            email: member.snapshotEmail ?? member.user.email,
            user: undefined,
            additionalAnswersReady: member.supplementalRequests.every(
               (request) =>
                  request.withdrawnAt ||
                  request.answeredAt ||
                  !request.question.isRequired,
            ),
         })),
      });
   }

   async removeMember(
      eventId: string,
      registrationId: string,
      userId: string,
      body: RemoveBundleMemberRequest,
      actor: { id: string; roles?: unknown },
   ) {
      await eventService.assertScope(eventId, actor);
      const result = await retrySerializable(() =>
         repo.changeBundleMember(
            registrationId,
            userId,
            actor.id,
            body.expectedRevision,
            true,
            body.reason,
            eventId,
         ),
      );
      this.assertMembershipResult(result.result);
      return { removed: true };
   }

   async list(userId: string, query: EventRegistrationListQuery) {
      const { data, total } = await repo.list(userId, query);
      return serialize({
         data,
         meta: {
            page: query.page,
            limit: query.limit,
            totalRecords: total,
            totalPages: Math.ceil(total / query.limit),
         },
      });
   }

   async get(id: string, userId: string) {
      const [initialOrder, profileSource] = await Promise.all([
         repo.owned(id, userId),
         repo.profile(userId),
      ]);
      if (!initialOrder)
         throw new AppError(
            'Registration not found',
            404,
            'REGISTRATION_NOT_FOUND',
         );
      let order = initialOrder;
      if (order.status === 'ASSEMBLING') {
         await this.finalizeIfReady(id, userId);
         order = (await repo.owned(id, userId))!;
      }
      const members = order.members.map((member) => {
         const current = member.userId === userId;
         const ownSubmission = member.submissions[0];
         const required = new Set(
            ownSubmission?.form.sections
               .flatMap(({ questions }) => questions)
               .filter(({ isRequired }) => isRequired)
               .map(({ id }) => id),
         );
         const answered = new Set(
            ownSubmission?.answers
               .filter(
                  (answer) =>
                     answer.textValue !== null ||
                     answer.numberValue !== null ||
                     answer.dateValue !== null ||
                     answer.selectedOptions.length > 0,
               )
               .map(({ formQuestionId }) => formQuestionId),
         );
         const profileReady = resolveRegistrationProfile(member.user).complete;
         return {
            id: member.id,
            status: member.status,
            position: member.position,
            name: member.user.name,
            isCurrentUser: current,
            ready:
               member.status === 'LOCKED' ||
               (member.status === 'ACTIVE' &&
                  profileReady &&
                  [...required].every((id) => answered.has(id))),
            ...(current && {
               supplementalRevision: member.supplementalRevision,
               supplementalRequests: member.supplementalRequests,
               snapshotName: member.snapshotName,
               snapshotNim: member.snapshotNim,
               snapshotOutlookEmail: member.snapshotOutlookEmail,
               snapshotEmail: member.snapshotEmail,
               snapshotUniversity: member.snapshotUniversity,
               snapshotStudyProgram: member.snapshotStudyProgram,
               snapshotRegion: member.snapshotRegion,
               snapshotPhoneNumber: member.snapshotPhoneNumber,
               snapshotAt: member.snapshotAt,
               submissions: member.submissions,
               ticket:
                  order.status === 'CONFIRMED' &&
                  member.status === 'LOCKED' &&
                  member.ticket?.status === 'ACTIVE'
                     ? member.ticket
                     : null,
            }),
         };
      });
      const bundleCode =
         order.seatCount > 1 && order.bundleCodeEncrypted
            ? decryptBundleCode(order.bundleCodeEncrypted)
            : null;
      return serialize({
         ...order,
         bundleCodeHash: undefined,
         bundleCodeEncrypted: undefined,
         ...(order.seatCount > 1 && { bundleCode }),
         members,
         profile: profileSource
            ? resolveRegistrationProfile(profileSource)
            : null,
      });
   }

   async replaceAnswers(
      id: string,
      body: ReplaceRegistrationAnswersRequest,
      userId: string,
   ) {
      const order = await repo.owned(id, userId);
      if (!order)
         throw new AppError(
            'Registration not found',
            404,
            'REGISTRATION_NOT_FOUND',
         );
      const formId = order.members.find(({ userId: id }) => id === userId)
         ?.submissions[0]?.registrationFormId;
      const form = formId ? await repo.form(formId) : null;
      if (!form)
         throw new AppError(
            'The registration form is unavailable',
            409,
            'PUBLISHED_FORM_REQUIRED',
         );
      let validated;
      try {
         validated = validateRegistrationAnswers(
            questionsOf(form),
            body.answers,
         );
      } catch (error) {
         throw validationError(error);
      }
      const result = await retrySerializable(() =>
         repo.replaceAnswers(
            id,
            userId,
            body.expectedRevision,
            validated.answers,
         ),
      );
      if (result.result === 'NOT_FOUND')
         throw new AppError(
            'Registration not found',
            404,
            'REGISTRATION_NOT_FOUND',
         );
      if (result.result === 'REVISION_CONFLICT')
         throw new AppError(
            'Registration revision does not match',
            409,
            'REVISION_CONFLICT',
         );
      if (result.result === 'LOCKED')
         throw new AppError(
            'Answers can only be changed while registration is assembling',
            409,
            'REGISTRATION_LOCKED',
         );
      await this.finalizeIfReady(id, userId);
      return this.get(id, userId);
   }

   async cancel(
      id: string,
      body: CancelEventRegistrationRequest,
      userId: string,
   ) {
      const result = await retrySerializable(() =>
         repo.cancel(id, userId, body.expectedRevision),
      );
      if (result.result === 'NOT_FOUND')
         throw new AppError(
            'Registration not found',
            404,
            'REGISTRATION_NOT_FOUND',
         );
      if (result.result === 'REVISION_CONFLICT')
         throw new AppError(
            'Registration revision does not match',
            409,
            'REVISION_CONFLICT',
         );
      if (result.result === 'LOCKED')
         throw new AppError(
            'Registration cannot be cancelled',
            409,
            'REGISTRATION_LOCKED',
         );
      if (result.result === 'CANCELLATION_CLOSED')
         throw new AppError(
            'The cancellation deadline has passed',
            409,
            'CANCELLATION_CLOSED',
         );
      return { cancelled: true as const };
   }

   private async finalizeIfReady(id: string, userId: string) {
      return retrySerializable(() => repo.finalize(id, userId));
   }

   private assertCreateResult(result: string, bundle: boolean) {
      if (result === 'CREATED') return;
      if (result === 'EVENT_NOT_FOUND')
         throw new AppError('Event not found', 404, 'EVENT_NOT_FOUND');
      if (result === 'REGISTRATION_CLOSED')
         throw new AppError(
            'Event registration is closed',
            409,
            'REGISTRATION_CLOSED',
         );
      if (result === 'PACKAGE_NOT_FOUND')
         throw new AppError(
            `Active ${bundle ? 'Bundle' : 'individual'} package not found`,
            404,
            'TICKET_PACKAGE_NOT_FOUND',
         );
      if (result === 'PAYMENT_UNCONFIGURED')
         throw new AppError(
            'Event payment destination is not configured',
            409,
            'PAYMENT_NOT_CONFIGURED',
         );
      if (result === 'FORM_NOT_FOUND')
         throw new AppError(
            'No published registration form is available',
            409,
            'PUBLISHED_FORM_REQUIRED',
         );
      if (result === 'DUPLICATE')
         throw new AppError(
            'You already have an active registration for this event',
            409,
            'ACTIVE_REGISTRATION_EXISTS',
         );
   }

   private assertMembershipResult(result: string) {
      if (result === 'REPLACED' || result === 'CHANGED') return;
      if (result === 'REVISION_CONFLICT')
         throw new AppError(
            'Registration revision does not match',
            409,
            'REVISION_CONFLICT',
         );
      if (result === 'LOCKED')
         throw new AppError(
            'Bundle membership is locked',
            409,
            'REGISTRATION_LOCKED',
         );
      throw new AppError(
         'Registration not found',
         404,
         'REGISTRATION_NOT_FOUND',
      );
   }
}

export const eventRegistrationService = new EventRegistrationService();
