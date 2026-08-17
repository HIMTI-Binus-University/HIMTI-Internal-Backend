import type { Request, Response } from 'express';
import { z } from 'zod';
import { auth } from '@/utils/auth.js';
import { fromNodeHeaders } from 'better-auth/node';
import { eventRegistrationService } from './eventRegistrationService.js';
import {
   cancelRegistrationSchema,
   createEventRegistrationSchema,
   eventIdParamsSchema,
   eventRegistrationPaginationSchema,
   idempotencyKeySchema,
   registrationContextQuerySchema,
   registrationIdParamsSchema,
   replaceRegistrationResponsesSchema,
   subEventIdParamsSchema,
   submitRegistrationSchema,
   internalRegistrationListSchema,
   internalQueueQuerySchema,
   registrationDecisionSchema,
   registrationReasonDecisionSchema,
   bulkRegistrationDecisionSchema,
   bulkRegistrationReasonDecisionSchema,
} from './eventRegistrationSchema.js';

export const listInternalRegistrations = async (
   req: Request,
   res: Response,
) => {
   const { subEventId } = subEventIdParamsSchema.parse(req.params);
   const result = await eventRegistrationService.listInternal(
      subEventId,
      res.locals.user,
      internalRegistrationListSchema.parse(req.query),
   );
   res.status(200).json({ msg: 'success', ...result });
};

export const getInternalRegistrationCapacity = async (
   req: Request,
   res: Response,
) => {
   const { subEventId } = subEventIdParamsSchema.parse(req.params);
   const result = await eventRegistrationService.getCapacity(
      subEventId,
      res.locals.user,
   );
   res.status(200).json({ msg: 'success', data: result });
};

const internalParams = z.object({
   registrationId: z.string().min(1),
});

export const getInternalRegistration = async (req: Request, res: Response) => {
   const { registrationId } = internalParams.parse(req.params);
   const result = await eventRegistrationService.getInternal(
      registrationId,
      res.locals.user,
   );
   res.status(200).json({ msg: 'success', data: result });
};

export const getInternalQueueNeighbors = async (
   req: Request,
   res: Response,
) => {
   const { subEventId, registrationId } = z
      .object({
         subEventId: z.string().min(1),
         registrationId: z.string().min(1),
      })
      .parse(req.params);
   const result = await eventRegistrationService.getQueueNeighbors(
      subEventId,
      registrationId,
      res.locals.user,
      internalQueueQuerySchema.parse(req.query),
   );
   res.status(200).json({ msg: 'success', data: result });
};

const registrationAction =
   (
      action: 'APPROVED' | 'REJECTED' | 'NEEDS_CORRECTION' | 'CANCELLED',
      reasonRequired = false,
   ) =>
   async (req: Request, res: Response) => {
      const { registrationId } = internalParams.parse(req.params);
      const payload = (
         reasonRequired
            ? registrationReasonDecisionSchema
            : registrationDecisionSchema
      ).parse(req.body);
      const result = await eventRegistrationService.review(
         registrationId,
         res.locals.user,
         action,
         payload,
      );
      res.status(200).json({ msg: 'success', data: result });
   };

export const approveInternalRegistration = registrationAction('APPROVED');
export const rejectInternalRegistration = registrationAction('REJECTED', true);
export const requestRegistrationCorrection = registrationAction(
   'NEEDS_CORRECTION',
   true,
);
export const adminCancelInternalRegistration = registrationAction(
   'CANCELLED',
   true,
);

const bulkAction =
   (action: 'APPROVED' | 'REJECTED' | 'CANCELLED') =>
   async (req: Request, res: Response) => {
      const { subEventId } = subEventIdParamsSchema.parse(req.params);
      const payload = (
         action === 'APPROVED'
            ? bulkRegistrationDecisionSchema
            : bulkRegistrationReasonDecisionSchema
      ).parse(req.body);
      const result = await eventRegistrationService.bulkReview(
         subEventId,
         res.locals.user,
         action,
         payload,
      );
      res.status(200).json({ msg: 'success', data: result });
   };

export const bulkApproveInternalRegistrations = bulkAction('APPROVED');
export const bulkRejectInternalRegistrations = bulkAction('REJECTED');
export const bulkCancelInternalRegistrations = bulkAction('CANCELLED');

export const listPublicEvents = async (req: Request, res: Response) => {
   const query = eventRegistrationPaginationSchema.parse(req.query);
   const result = await eventRegistrationService.listPublicEvents(query);
   res.status(200).json({ msg: 'success', ...result });
};

export const getPublicEvent = async (req: Request, res: Response) => {
   const { eventId } = eventIdParamsSchema.parse(req.params);
   const result = await eventRegistrationService.getPublicEvent(eventId);
   res.status(200).json({ msg: 'success', data: result });
};

export const getRegistrationContext = async (req: Request, res: Response) => {
   const { subEventId } = subEventIdParamsSchema.parse(req.params);
   const { inviteToken } = registrationContextQuerySchema.parse(req.query);
   let session: Awaited<ReturnType<typeof auth.api.getSession>> = null;
   try {
      session = await auth.api.getSession({
         headers: fromNodeHeaders(req.headers),
      });
   } catch {
      session = null;
   }
   const result = await eventRegistrationService.getContext(
      subEventId,
      session?.user,
      inviteToken,
   );
   res.status(200).json({ msg: 'success', data: result });
};

export const createRegistration = async (req: Request, res: Response) => {
   const { subEventId } = subEventIdParamsSchema.parse(req.params);
   const payload = createEventRegistrationSchema.parse(req.body ?? {});
   const result = await eventRegistrationService.create(
      subEventId,
      res.locals.user,
      payload,
   );
   res.status(200).json({ msg: 'success', data: result });
};

export const listMyRegistrations = async (req: Request, res: Response) => {
   const query = eventRegistrationPaginationSchema.parse(req.query);
   const result = await eventRegistrationService.listMine(
      res.locals.user,
      query,
   );
   res.status(200).json({ msg: 'success', ...result });
};

export const getMyRegistration = async (req: Request, res: Response) => {
   const { registrationId } = registrationIdParamsSchema.parse(req.params);
   const result = await eventRegistrationService.getMine(
      registrationId,
      res.locals.user,
   );
   res.status(200).json({ msg: 'success', data: result });
};

export const replaceRegistrationResponses = async (
   req: Request,
   res: Response,
) => {
   const { registrationId } = registrationIdParamsSchema.parse(req.params);
   const payload = replaceRegistrationResponsesSchema.parse(req.body);
   const result = await eventRegistrationService.replaceResponses(
      registrationId,
      res.locals.user,
      payload,
   );
   res.status(200).json({ msg: 'success', data: result });
};

export const submitRegistration = async (req: Request, res: Response) => {
   const { registrationId } = registrationIdParamsSchema.parse(req.params);
   submitRegistrationSchema.parse(req.body ?? {});
   const idempotencyKey = idempotencyKeySchema.parse(
      req.get('Idempotency-Key'),
   );
   const result = await eventRegistrationService.submit(
      registrationId,
      res.locals.user,
      idempotencyKey,
   );
   res.status(200).json({ msg: 'success', data: result });
};

export const cancelRegistration = async (req: Request, res: Response) => {
   const { registrationId } = registrationIdParamsSchema.parse(req.params);
   const { reason } = cancelRegistrationSchema.parse(req.body ?? {});
   const result = await eventRegistrationService.cancel(
      registrationId,
      res.locals.user,
      reason,
   );
   res.status(200).json({ msg: 'success', data: result });
};
