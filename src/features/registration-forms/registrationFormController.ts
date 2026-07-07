import { Request, Response } from 'express';
import {
   CreateFormQuestionSchema,
   DeleteFormQuestionSchema,
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
