import { Request, Response } from 'express';
import {
   CreateFormQuestionOptionSchema,
   CreateFormQuestionSchema,
   DeleteFormQuestionOptionSchema,
   DeleteFormQuestionSchema,
   ReorderFormQuestionsSchema,
   UpdateFormQuestionOptionSchema,
   UpdateFormQuestionSchema,
   CloneRegistrationFormV1Schema,
   CreateRegistrationFormV1Schema,
   PublishedRegistrationFormParamsSchema,
   RegistrationFormIdParamsSchema,
   RegistrationFormListQuerySchema,
   RegistrationFormLifecycleV1Schema,
   SaveRegistrationFormDraftV1Schema,
} from './registrationFormSchema.js';
import { registrationFormService } from './registrationFormService.js';

export const listRegistrationFormsV1 = async (req: Request, res: Response) => {
   const query = RegistrationFormListQuerySchema.parse(req.query);
   const data = await registrationFormService.listV1(
      query.subEventId,
      res.locals.user,
   );
   res.status(200).json({ msg: 'success', data });
};

export const getRegistrationFormV1 = async (req: Request, res: Response) => {
   const { id } = RegistrationFormIdParamsSchema.parse(req.params);
   const data = await registrationFormService.getV1(id, res.locals.user);
   res.status(200).json({ msg: 'success', data });
};

export const createRegistrationFormV1 = async (req: Request, res: Response) => {
   const payload = CreateRegistrationFormV1Schema.parse(req.body);
   const data = await registrationFormService.createV1(
      payload,
      res.locals.user,
   );
   res.status(201).json({ msg: 'success', data });
};

export const saveRegistrationFormDraftV1 = async (
   req: Request,
   res: Response,
) => {
   const { id } = RegistrationFormIdParamsSchema.parse(req.params);
   const payload = SaveRegistrationFormDraftV1Schema.parse(req.body);
   const data = await registrationFormService.saveDraftV1(
      id,
      payload,
      res.locals.user,
   );
   res.status(200).json({ msg: 'success', data });
};

export const validateRegistrationFormV1 = async (
   req: Request,
   res: Response,
) => {
   const { id } = RegistrationFormIdParamsSchema.parse(req.params);
   const payload = SaveRegistrationFormDraftV1Schema.parse(req.body);
   const data = await registrationFormService.validateV1(
      id,
      payload,
      res.locals.user,
   );
   res.status(200).json({ msg: 'success', data });
};

export const previewRegistrationFormV1 = async (
   req: Request,
   res: Response,
) => {
   const { id } = RegistrationFormIdParamsSchema.parse(req.params);
   const payload = SaveRegistrationFormDraftV1Schema.parse(req.body);
   const data = await registrationFormService.previewV1(
      id,
      payload,
      res.locals.user,
   );
   res.status(200).json({ msg: 'success', data });
};

export const cloneRegistrationFormV1 = async (req: Request, res: Response) => {
   const { id } = RegistrationFormIdParamsSchema.parse(req.params);
   const payload = CloneRegistrationFormV1Schema.parse(req.body ?? {});
   const data = await registrationFormService.cloneV1(
      id,
      payload,
      res.locals.user,
   );
   res.status(201).json({ msg: 'success', data });
};

export const publishRegistrationFormV1 = async (
   req: Request,
   res: Response,
) => {
   const { id } = RegistrationFormIdParamsSchema.parse(req.params);
   const payload = RegistrationFormLifecycleV1Schema.parse(req.body);
   const data = await registrationFormService.publishV1(
      id,
      payload,
      res.locals.user,
   );
   res.status(200).json({ msg: 'success', data });
};

export const closeRegistrationFormV1 = async (req: Request, res: Response) => {
   const { id } = RegistrationFormIdParamsSchema.parse(req.params);
   const payload = RegistrationFormLifecycleV1Schema.parse(req.body);
   const data = await registrationFormService.closeV1(
      id,
      payload,
      res.locals.user,
   );
   res.status(200).json({ msg: 'success', data });
};

export const getPublishedRegistrationFormV1 = async (
   req: Request,
   res: Response,
) => {
   const params = PublishedRegistrationFormParamsSchema.parse(req.params);
   const data = await registrationFormService.getPublishedV1(
      params.subEventId,
      params.logicalKey,
   );
   res.status(200).json({ msg: 'success', data });
};

export const createFormQuestion = async (req: Request, res: Response) => {
   const data = req.body;
   const { id } = req.params;
   const userData = res.locals.user;
   const validation = CreateFormQuestionSchema.safeParse(data);

   if (!validation.success) {
      return res.status(400).json({ errors: validation.error.format() });
   }

   const result = await registrationFormService.createFormQuestion(
      validation.data,
      id as string,
      userData,
   );
   res.status(201).json({
      msg: 'success',
      data: result,
   });
};

export const updateFormQuestion = async (req: Request, res: Response) => {
   const data = req.body;
   const { id } = req.params;
   const userData = res.locals.user;
   const validation = UpdateFormQuestionSchema.safeParse(data);

   if (!validation.success) {
      return res.status(400).json({ errors: validation.error.format() });
   }

   const result = await registrationFormService.updateFormQuestion(
      validation.data,
      id as string,
      userData,
   );
   res.status(200).json({
      msg: 'success',
      data: result,
   });
};

export const reorderFormQuestions = async (req: Request, res: Response) => {
   const data = req.body;
   const { id } = req.params;
   const userData = res.locals.user;
   const validation = ReorderFormQuestionsSchema.safeParse(data);

   if (!validation.success) {
      return res.status(400).json({ errors: validation.error.format() });
   }

   const result = await registrationFormService.reorderFormQuestions(
      validation.data,
      id as string,
      userData,
   );
   res.status(200).json({
      msg: 'success',
      data: result,
   });
};

export const deleteFormQuestion = async (req: Request, res: Response) => {
   const { id } = req.params;
   const userData = res.locals.user;
   const validation = DeleteFormQuestionSchema.safeParse(req.body ?? {});

   if (!validation.success) {
      return res.status(400).json({ errors: validation.error.format() });
   }

   const result = await registrationFormService.deleteFormQuestion(
      id as string,
      userData,
   );
   res.status(200).json({
      msg: 'success',
      data: result,
   });
};

export const createFormQuestionOption = async (req: Request, res: Response) => {
   const data = req.body;
   const { id } = req.params;
   const userData = res.locals.user;
   const validation = CreateFormQuestionOptionSchema.safeParse(data);

   if (!validation.success) {
      return res.status(400).json({ errors: validation.error.format() });
   }

   const result = await registrationFormService.createFormQuestionOption(
      validation.data,
      id as string,
      userData,
   );
   res.status(201).json({
      msg: 'success',
      data: result,
   });
};

export const updateFormQuestionOption = async (req: Request, res: Response) => {
   const data = req.body;
   const { id } = req.params;
   const userData = res.locals.user;
   const validation = UpdateFormQuestionOptionSchema.safeParse(data);

   if (!validation.success) {
      return res.status(400).json({ errors: validation.error.format() });
   }

   const result = await registrationFormService.updateFormQuestionOption(
      validation.data,
      id as string,
      userData,
   );
   res.status(200).json({
      msg: 'success',
      data: result,
   });
};

export const deleteFormQuestionOption = async (req: Request, res: Response) => {
   const { id } = req.params;
   const userData = res.locals.user;
   const validation = DeleteFormQuestionOptionSchema.safeParse(req.body ?? {});

   if (!validation.success) {
      return res.status(400).json({ errors: validation.error.format() });
   }

   const result = await registrationFormService.deleteFormQuestionOption(
      id as string,
      userData,
   );
   res.status(200).json({
      msg: 'success',
      data: result,
   });
};
