import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

export function validateBody(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error: any) {
      if (error instanceof ZodError) {
        const formattedErrors: Record<string, string> = {};
        const issues = (error as any).issues || (error as any).errors || [];
        issues.forEach((err: any) => {
          const path = Array.isArray(err.path) ? err.path.join('.') : 'field';
          formattedErrors[path || 'field'] = err.message;
        });

        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: formattedErrors
        });
        return;
      }

      res.status(400).json({
        success: false,
        message: 'Invalid request payload'
      });
    }
  };
}
