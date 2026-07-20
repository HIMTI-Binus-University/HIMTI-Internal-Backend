import { Request, Response } from 'express';
import {
   CreateFormQuestionOptionSchema,
   CreateFormQuestionSchema,
   DeleteFormQuestionOptionSchema,
   DeleteFormQuestionSchema,
   ReorderFormQuestionsSchema,
   UpdateFormQuestionOptionSchema,
   UpdateFormQuestionSchema,
} from './registrationFormSchema.js';
import { registrationFormService } from './registrationFormService.js';

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
