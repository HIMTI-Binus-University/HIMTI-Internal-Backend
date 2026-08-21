import type { Request, Response } from 'express';
import { postRegistrationFormService } from './postRegistrationFormService.js';
import {
   internalPostRegistrationListQuerySchema,
   postRegistrationAssignmentParamsSchema,
   postRegistrationCorrectionSchema,
   postRegistrationIdempotencyKeySchema,
   postRegistrationParamsSchema,
   postRegistrationSubEventParamsSchema,
   savePostRegistrationResponseSchema,
   submitPostRegistrationResponseSchema,
} from './postRegistrationFormSchema.js';

export const listMyPostRegistrationAssignments = async (
   req: Request,
   res: Response,
) => {
   const { registrationId } = postRegistrationParamsSchema.parse(req.params);
   res.json({
      msg: 'success',
      data: await postRegistrationFormService.listOwned(
         registrationId,
         res.locals.user,
      ),
   });
};
export const getMyPostRegistrationAssignment = async (
   req: Request,
   res: Response,
) => {
   const { registrationId, assignmentId } =
      postRegistrationAssignmentParamsSchema.parse(req.params);
   res.json({
      msg: 'success',
      data: await postRegistrationFormService.detailOwned(
         registrationId,
         assignmentId,
         res.locals.user,
      ),
   });
};
export const saveMyPostRegistrationResponse = async (
   req: Request,
   res: Response,
) => {
   const { registrationId, assignmentId } =
      postRegistrationAssignmentParamsSchema.parse(req.params);
   res.json({
      msg: 'success',
      data: await postRegistrationFormService.save(
         registrationId,
         assignmentId,
         res.locals.user,
         savePostRegistrationResponseSchema.parse(req.body),
      ),
   });
};
export const submitMyPostRegistrationResponse = async (
   req: Request,
   res: Response,
) => {
   const { registrationId, assignmentId } =
      postRegistrationAssignmentParamsSchema.parse(req.params);
   const key = postRegistrationIdempotencyKeySchema.parse(
      req.header('Idempotency-Key'),
   );
   res.json({
      msg: 'success',
      data: await postRegistrationFormService.submit(
         registrationId,
         assignmentId,
         res.locals.user,
         submitPostRegistrationResponseSchema.parse(req.body).revision,
         key,
      ),
   });
};
export const listInternalPostRegistrationAssignments = async (
   req: Request,
   res: Response,
) => {
   const { subEventId } = postRegistrationSubEventParamsSchema.parse(
      req.params,
   );
   res.json({
      msg: 'success',
      ...(await postRegistrationFormService.listInternal(
         subEventId,
         res.locals.user,
         internalPostRegistrationListQuerySchema.parse(req.query),
      )),
   });
};
export const getInternalPostRegistrationAssignment = async (
   req: Request,
   res: Response,
) => {
   res.json({
      msg: 'success',
      data: await postRegistrationFormService.detailInternal(
         String(req.params.assignmentId),
         res.locals.user,
      ),
   });
};
export const requestPostRegistrationCorrection = async (
   req: Request,
   res: Response,
) => {
   res.json({
      msg: 'success',
      data: await postRegistrationFormService.correct(
         String(req.params.assignmentId),
         res.locals.user,
         postRegistrationCorrectionSchema.parse(req.body),
      ),
   });
};
export const reopenPostRegistrationAssignment = async (
   req: Request,
   res: Response,
) => {
   res.json({
      msg: 'success',
      data: await postRegistrationFormService.reopen(
         String(req.params.assignmentId),
         res.locals.user,
         postRegistrationCorrectionSchema.parse(req.body),
      ),
   });
};
