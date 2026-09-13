import { Request, Response, NextFunction } from 'express';
import { ZodError, ZodSchema } from 'zod';
 
interface RequestSchemas {
  body?: ZodSchema;
  params?: ZodSchema;
  query?: ZodSchema;
}
 
export const validateRequest = (schemas: RequestSchemas) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      if (schemas.body) {
        req.body = schemas.body.parse(req.body);
      }
 
      if (schemas.params) {
        req.params = schemas.params.parse(req.params) as typeof req.params;
      }
 
      if (schemas.query) {
        req.query = schemas.query.parse(req.query) as typeof req.query;
      }
 
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: error.issues.map((issue) => ({
            field: issue.path.join('.'),
            message: issue.message,
          })),
        });
      }
      next(error);
    }
  };
};